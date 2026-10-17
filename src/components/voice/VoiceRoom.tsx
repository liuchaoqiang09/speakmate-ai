"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Captions, CaptionsOff, Mic } from "lucide-react";
import type { IRTCEngine } from "@volcengine/rtc";
import { AiChineseTranslation } from "@/src/components/practice/AiChineseTranslation";
import {
  parseRoomBinarySubtitle,
  type VoiceSubtitleLine,
} from "@/src/lib/volc/parseSubtitleMessage";
import { readRtcAccessToken } from "@/src/lib/volc/readRtcToken";
import {
  readCaptionsHiddenPref,
  readVoicePref,
  writeCaptionsHiddenPref,
  writeVoicePref,
} from "@/src/lib/prefs/practicePrefs";
import { SPEAKMATE_VOICES, type SpeakMateVoiceId } from "@/src/lib/volc/voices";

type VoiceCredentials = {
  appId: string;
  token: string;
  roomId: string;
  userId: string;
  taskId: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type VoiceCaption = {
  id: string;
  role: "user" | "assistant";
  speakerId: string;
  content: string;
  spokenAt: string;
  definite: boolean;
  paragraph: boolean;
};

export type VoiceRoomHandle = {
  leave: () => Promise<void>;
};

type VoicePhase = "idle" | "connecting" | "live" | "error";

type VoiceRoomProps = {
  /** 页面已经创建的练习有值时不再重复创建 */
  sessionId?: string;
  /** 一句字幕定稿后通知页面，用于考试计时 */
  onDefiniteCaption?: (caption: { role: "user" | "assistant"; content: string }) => void;
  /** 通话接通后开始考试计时 */
  onLive?: () => void;
  /** 切后台过久或连接断开后，房间已关掉，页面去出总结 */
  onEnded?: () => void;
  /** 听后复述时，学员复述前不显示原句 */
  deferAssistantText?: boolean;
  /** 还没有练习时，开始通话前用这些参数创建 */
  draft?: {
    mode: "general" | "exam";
    topic: string;
    difficulty?: string | null;
    feedbackMode?: string | null;
    examType?: string | null;
  };
};

function finalKey(line: VoiceSubtitleLine): string {
  return `${line.userId}:${line.roundId ?? ""}:${line.sequence}`;
}

/**
 * 火山引擎实时语音通话区域
 * SDK 只在浏览器里动态加载，避免 Next.js 服务端渲染报错
 * 字幕来自 onRoomBinaryMessageReceived 里的 subv 帧
 */
export const VoiceRoom = forwardRef<VoiceRoomHandle, VoiceRoomProps>(
  function VoiceRoom({ sessionId = "", draft, onDefiniteCaption, onLive, onEnded, deferAssistantText = false }, ref) {
    const [phase, setPhase] = useState<VoicePhase>("idle");
    const [detail, setDetail] = useState("Allow the microphone, then tap to speak");
    const [partnerId, setPartnerId] = useState("");
    const [captions, setCaptions] = useState<VoiceCaption[]>([]);
    const [captionsHidden, setCaptionsHidden] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [voice, setVoice] = useState<SpeakMateVoiceId>("male");
    const [elapsed, setElapsed] = useState(0);
    const voiceRef = useRef<SpeakMateVoiceId>("male");
    const engineRef = useRef<IRTCEngine | null>(null);
    const leavingRef = useRef<Promise<void> | null>(null);
    const localUserIdRef = useRef("");
    const sessionIdRef = useRef(sessionId);
    const captionsRef = useRef<VoiceCaption[]>([]);
    const savedKeysRef = useRef(new Set<string>());
    const writeQueueRef = useRef(Promise.resolve());
    const listEndRef = useRef<HTMLDivElement | null>(null);
    const onDefiniteRef = useRef(onDefiniteCaption);
    const onLiveRef = useRef(onLive);
    const onEndedRef = useRef(onEnded);
    const roomIdRef = useRef("");
    const taskIdRef = useRef("");
    const backgroundTimerRef = useRef<number | null>(null);
    const liveRef = useRef(false);

    useEffect(() => {
      onDefiniteRef.current = onDefiniteCaption;
    }, [onDefiniteCaption]);

    useEffect(() => {
      onLiveRef.current = onLive;
    }, [onLive]);

    useEffect(() => {
      onEndedRef.current = onEnded;
    }, [onEnded]);

    useEffect(() => {
      sessionIdRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
      const stored = readVoicePref();
      setVoice(stored);
      voiceRef.current = stored;
      setCaptionsHidden(readCaptionsHiddenPref());
    }, []);

    useEffect(() => {
      if (phase !== "live") {
        return;
      }
      setElapsed(0);
      const timer = window.setInterval(() => {
        setElapsed((current) => current + 1);
      }, 1000);
      return () => window.clearInterval(timer);
    }, [phase]);

    function chooseVoice(next: SpeakMateVoiceId) {
      if (phase === "connecting" || phase === "live") {
        return;
      }
      setVoice(next);
      voiceRef.current = next;
      writeVoicePref(next);
    }

    useEffect(() => {
      if (captionsHidden) {
        return;
      }
      listEndRef.current?.scrollIntoView({ block: "end" });
    }, [captions, captionsHidden]);

    async function postCaption(
      caption: VoiceCaption,
      practiceId: string
    ): Promise<{ status: "saved" | "unauthorized" | "failed"; error: string }> {
      const response = await fetch(
        `/api/v1/practice-sessions/${practiceId}/messages/voice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: caption.role,
            contentText: caption.content,
          }),
        }
      );

      if (response.status === 401) {
        window.location.assign("/login");
        return { status: "unauthorized", error: "未登录" };
      }

      if (response.ok) {
        return { status: "saved", error: "" };
      }

      const result = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
      return {
        status: "failed",
        error: result?.error || "这句字幕没能写入练习记录",
      };
    }

    function enqueueSave(caption: VoiceCaption, key: string) {
      const practiceId = sessionIdRef.current;
      if (!practiceId) {
        savedKeysRef.current.delete(key);
        setSaveError("还没有练习记录，这句字幕无法保存");
        return;
      }

      const task = writeQueueRef.current.then(async () => {
        try {
          const first = await postCaption(caption, practiceId);
          if (first.status === "saved") {
            setSaveError("");
            return;
          }
          if (first.status === "unauthorized") {
            return;
          }
          const retried = await postCaption(caption, practiceId);
          if (retried.status === "saved") {
            setSaveError("");
            return;
          }
          if (retried.status !== "unauthorized") {
            savedKeysRef.current.delete(key);
            setSaveError(retried.error || first.error);
          }
        } catch {
          savedKeysRef.current.delete(key);
          setSaveError("网络错误，这句字幕没能写入练习记录");
        }
      });

      writeQueueRef.current = task.then(
        () => undefined,
        () => undefined
      );
    }

    function applySubtitle(line: VoiceSubtitleLine) {
      if (line.definite && savedKeysRef.current.has(finalKey(line))) {
        return;
      }

      const role: "user" | "assistant" =
        line.userId === localUserIdRef.current ? "user" : "assistant";
      const prev = captionsRef.current;
      const last = prev[prev.length - 1];
      let target: VoiceCaption;
      let next: VoiceCaption[];

      if (last && last.speakerId === line.userId && !last.definite) {
        target = {
          ...last,
          content: line.text,
          definite: line.definite,
          paragraph: line.paragraph,
        };
        next = [...prev.slice(0, -1), target];
      } else if (
        last &&
        last.speakerId === line.userId &&
        last.definite &&
        last.content === line.text
      ) {
        return;
      } else {
        target = {
          id: crypto.randomUUID(),
          role,
          speakerId: line.userId,
          content: line.text,
          spokenAt: new Date().toISOString(),
          definite: line.definite,
          paragraph: line.paragraph,
        };
        next = [...prev, target];
      }

      captionsRef.current = next;
      setCaptions(next);

      if (!line.definite) {
        return;
      }

      const key = finalKey(line);
      savedKeysRef.current.add(key);
      enqueueSave(target, key);
      onDefiniteRef.current?.({ role: target.role, content: target.content });
    }

    function onBinaryMessage(event: { message: ArrayBuffer }) {
      const lines = parseRoomBinarySubtitle(event.message);
      if (!lines) {
        return;
      }
      for (const line of lines) {
        applySubtitle(line);
      }
    }

    async function ensureSession(): Promise<string | null> {
      if (sessionIdRef.current) {
        return sessionIdRef.current;
      }
      if (!draft?.topic?.trim() || !draft.mode) {
        return null;
      }

      const response = await fetch("/api/v1/practice-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: draft.mode,
          topic: draft.topic,
          difficulty: draft.difficulty,
          feedbackMode: draft.feedbackMode,
          examType: draft.examType,
        }),
      });

      if (response.status === 401) {
        window.location.assign("/login");
        return null;
      }

      const result = (await response.json()) as ApiResponse<{ session: { id: string } }>;
      if (!result.success || !result.data?.session.id) {
        setPhase("error");
        setDetail(result.error || "创建练习失败，本次通话未开始");
        return null;
      }

      sessionIdRef.current = result.data.session.id;
      return result.data.session.id;
    }

    function clearBackgroundTimer() {
      if (backgroundTimerRef.current !== null) {
        window.clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
    }

    function stopAgent(keepalive = false) {
      const roomId = roomIdRef.current;
      const taskId = taskIdRef.current;
      roomIdRef.current = "";
      taskIdRef.current = "";
      if (!roomId || !taskId) {
        return;
      }

      const body = JSON.stringify({ roomId, taskId });
      if (keepalive && typeof navigator !== "undefined") {
        try {
          void fetch("/api/v1/voice/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
            credentials: "include",
          });
        } catch {
          // 关闭页面时尽力通知服务端停掉智能体
        }
        return;
      }

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      void fetch("/api/v1/voice/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
        credentials: "include",
      }).finally(() => window.clearTimeout(timer));
    }

    async function leave() {
      if (leavingRef.current) {
        return leavingRef.current;
      }

      const task = (async () => {
        liveRef.current = false;
        clearBackgroundTimer();
        stopAgent(false);

        const engine = engineRef.current;
        engineRef.current = null;
        if (engine) {
          try {
            await engine.stopAudioCapture();
          } catch {
            // 停麦失败仍要退房
          }
          try {
            await engine.leaveRoom();
          } catch {
            // 离开房间失败时仍继续销毁引擎，避免麦克风一直占用
          }

          await new Promise((resolve) => setTimeout(resolve, 150));
          await writeQueueRef.current;

          try {
            const sdk = await import("@volcengine/rtc");
            sdk.default.destroyEngine(engine);
          } catch {
            engine.destroy();
          }
        }

        await writeQueueRef.current;
      })();

      leavingRef.current = task;
      try {
        await task;
      } finally {
        leavingRef.current = null;
      }
    }

    useImperativeHandle(ref, () => ({ leave }));
    const leaveRef = useRef(leave);
    leaveRef.current = leave;

    useEffect(() => {
      function onPageHide() {
        liveRef.current = false;
        clearBackgroundTimer();
        stopAgent(true);
        const engine = engineRef.current;
        engineRef.current = null;
        if (!engine) {
          return;
        }
        void engine.stopAudioCapture().catch(() => undefined);
        void engine.leaveRoom().catch(() => undefined);
        try {
          engine.destroy();
        } catch {
          // 关闭页面时引擎可能已经销毁
        }
      }

      function onVisibility() {
        if (document.visibilityState === "visible") {
          clearBackgroundTimer();
          return;
        }
        if (!liveRef.current) {
          return;
        }
        clearBackgroundTimer();
        backgroundTimerRef.current = window.setTimeout(() => {
          if (document.visibilityState === "visible" || !liveRef.current) {
            return;
          }
          void (async () => {
            await leaveRef.current();
            onEndedRef.current?.();
          })();
        }, 60_000);
      }

      window.addEventListener("pagehide", onPageHide);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        window.removeEventListener("pagehide", onPageHide);
        document.removeEventListener("visibilitychange", onVisibility);
        clearBackgroundTimer();
        if (liveRef.current || roomIdRef.current) {
          onPageHide();
        }
      };
    }, []);

    async function startCall() {
      if (phase === "connecting" || phase === "live") {
        return;
      }

      setPhase("connecting");
      setDetail("正在准备练习记录...");
      setPartnerId("");
      setSaveError("");
      captionsRef.current = [];
      savedKeysRef.current = new Set();
      setCaptions([]);

      try {
        const practiceId = await ensureSession();
        if (!practiceId) {
          setPhase("error");
          setDetail((current) =>
            current.startsWith("创建练习失败")
              ? current
              : "缺少练习记录，无法开始语音通话"
          );
          return;
        }

        await leave();

        setDetail("正在让 SpeakMate 进入房间...");
        const response = await fetch("/api/v1/voice/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current || undefined,
            voice: voiceRef.current,
          }),
        });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        const result = (await response.json()) as ApiResponse<VoiceCredentials>;
        if (!result.success || !result.data) {
          setPhase("error");
          setDetail(result.error || "SpeakMate 没能进入房间，本次通话未开始");
          return;
        }

        roomIdRef.current = result.data.roomId;
        taskIdRef.current = result.data.taskId || "";

        const claims = readRtcAccessToken(result.data.token);
        if (
          !claims ||
          claims.appId !== result.data.appId ||
          claims.roomId !== result.data.roomId ||
          claims.userId !== result.data.userId ||
          claims.expireAt * 1000 <= Date.now()
        ) {
          stopAgent(false);
          setPhase("error");
          setDetail("进房 Token 无效，已取消连接，不会进入空房间");
          return;
        }

        localUserIdRef.current = result.data.userId;
        setDetail("进房 Token 已核对，正在连接麦克风...");

        const sdk = await import("@volcengine/rtc");
        const VERTC = sdk.default;
        const supported = await VERTC.isSupported();
        if (!supported) {
          stopAgent(false);
          setPhase("error");
          setDetail("当前浏览器不支持火山引擎实时语音，请使用最新版 Chrome 或 Edge");
          return;
        }

        const permission = await VERTC.enableDevices({ video: false, audio: true });
        if (!permission.audio) {
          stopAgent(false);
          setPhase("error");
          setDetail("需要麦克风权限，请在浏览器设置里开启");
          return;
        }

        const engine = VERTC.createEngine(result.data.appId);
        engineRef.current = engine;

        engine.on(VERTC.events.onUserPublishStream, (event) => {
          if (
            event.mediaType === sdk.MediaType.AUDIO ||
            event.mediaType === sdk.MediaType.AUDIO_AND_VIDEO
          ) {
            setPartnerId(event.userId);
          }
        });

        engine.on(VERTC.events.onRoomBinaryMessageReceived, onBinaryMessage);

        engine.on(VERTC.events.onError, (event: unknown) => {
          const text = JSON.stringify(event ?? "");
          if (/stream not exist/i.test(text)) {
            return;
          }
          void (async () => {
            await leave();
            setPhase("error");
            setDetail("语音连接中断，通话已结束。可再点一次开始");
          })();
        });

        engine.on(VERTC.events.onAutoplayFailed, () => {
          setDetail("浏览器拦截了自动播放，请再点一次页面，或点击下方按钮重试播放");
        });

        await engine.joinRoom(
          result.data.token,
          result.data.roomId,
          { userId: result.data.userId },
          {
            isAutoPublish: false,
            isAutoSubscribeAudio: true,
            isAutoSubscribeVideo: false,
            roomProfileType: sdk.RoomProfileType.chat,
          }
        );

        await engine.startAudioCapture();
        await engine.publishStream(sdk.MediaType.AUDIO);

        liveRef.current = true;
        setPhase("live");
        onLiveRef.current?.();
        setDetail("Speak in English  SpeakMate 会语音回复");
      } catch (error) {
        await leave();
        const message = error instanceof Error ? error.message : "连接失败";
        setPhase("error");
        setDetail(`无法开始语音通话：${message}`);
      }
    }

    const lastCaption = captions[captions.length - 1];
    let turnTitle = "点麦克风开始 · Tap to speak";
    let turnHint = "请允许麦克风。第一句由 SpeakMate 来说。";
    if (phase === "connecting") {
      turnTitle = "正在进房 · Connecting";
      turnHint = "正在接通语音伙伴，请稍等几秒。";
    } else if (phase === "error") {
      turnTitle = "通话中断 · Disconnected";
      turnHint = "可再点麦克风重试。";
    } else if (phase === "live") {
      if (!lastCaption) {
        turnTitle = "请听 · SpeakMate is starting";
        turnHint = "正在说第一句，听完再开口。";
      } else if (lastCaption.role === "assistant" && !lastCaption.definite) {
        turnTitle = "请听 · SpeakMate is talking";
        turnHint = "等对方说完再接。";
      } else if (lastCaption.role === "user" && !lastCaption.definite) {
        turnTitle = "请说 · Your turn";
        turnHint = "正在听你说。";
      } else if (lastCaption.role === "assistant") {
        turnTitle = "请说 · Your turn";
        turnHint = "轮到你了。";
      } else {
        turnTitle = "请听 · SpeakMate is thinking";
        turnHint = "对方正在组织下一句。";
      }
    }
    const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
    const weakNet = phase === "live" && !partnerId && elapsed >= 12;
    const callLabel =
      phase === "connecting" ? "Connecting" : phase === "live" ? turnTitle : "Tap to speak";

    return (
      <section className="ink-card flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[#E6E6E6] px-4 py-3">
          <p className="text-sm text-[#6F6F6F]">
            {phase === "live" ? `本轮 ${clock}` : captionsHidden ? "纯语音模式" : "实时字幕"}
          </p>
          <button
            type="button"
            onClick={() =>
              setCaptionsHidden((current) => {
                const next = !current;
                writeCaptionsHiddenPref(next);
                return next;
              })
            }
            aria-pressed={captionsHidden}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E4DDD2] bg-white px-3 text-xs font-medium text-[#1C1917] transition-[border-color,background-color] hover:border-[#0E7C66] hover:bg-[#F3FAF7]"
          >
            {captionsHidden ? (
              <Captions size={14} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <CaptionsOff size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            {captionsHidden ? "显示字幕" : "隐藏字幕"}
          </button>
        </div>

        <div className="border-b border-[#ECE7DF] bg-[#F7F7F5] px-4 py-3">
          <p className="text-sm font-medium text-[#1C1917]">{turnTitle}</p>
          <p className="mt-1 text-xs leading-5 text-[#6F6A63]">{turnHint}</p>
          {weakNet ? (
            <p className="mt-2 text-xs text-[#B42318]">还没听到对方声音。请检查网络，或结束本轮再进。</p>
          ) : null}
        </div>

        <div className="flex min-h-[12rem] flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 pb-4">
          {captionsHidden ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="max-w-xs text-center text-sm leading-6 text-[#8A8A8A]">
                字幕已关闭 · 只听声音
              </p>
            </div>
          ) : null}

          {!captionsHidden && captions.length === 0 ? (
            <p className="rounded-2xl border border-[#E6E6E6] bg-[#F7F7F5] px-4 py-3 text-sm text-[#6F6F6F]">
              Captions appear here · 通话后显示字幕
            </p>
          ) : null}

          {!captionsHidden
            ? captions.map((message) => {
                const pending = !message.definite;
                const user = message.role === "user";
                const revealed =
                  !deferAssistantText ||
                  user ||
                  captions.some(
                    (item) => item.role === "user" && item.definite && item.spokenAt > message.spokenAt
                  );
                const content = revealed ? message.content : "Listen";
                return (
                  <div key={message.id} className={user ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        pending
                          ? user
                            ? "bubble-user bubble-live"
                            : "bubble-ai bubble-live"
                          : user
                            ? "bubble-user"
                            : "bubble-ai"
                      }
                    >
                      <p className={user && !pending ? "mb-1 text-xs text-white/65" : "mb-1 text-xs text-[#6F6F6F]"}>
                        {user ? "You" : "SpeakMate"}
                      </p>
                      <p className="whitespace-pre-wrap">
                        {content}
                        {pending && revealed ? " ..." : ""}
                      </p>
                      {!user ? (
                        <AiChineseTranslation
                          english={revealed ? message.content : ""}
                          enabled={revealed && !pending && Boolean(message.content.trim())}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })
            : null}
          <div ref={listEndRef} />
        </div>

        {saveError ? (
          <p className="ink-alert mx-4 mb-3" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="voice-dock flex flex-col items-center">
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {(Object.keys(SPEAKMATE_VOICES) as SpeakMateVoiceId[]).map((id) => (
              <button
                key={id}
                type="button"
                className="ink-chip"
                aria-pressed={voice === id}
                disabled={phase === "connecting" || phase === "live"}
                onClick={() => chooseVoice(id)}
              >
                {SPEAKMATE_VOICES[id].labelZh}
              </button>
            ))}
          </div>
          <p className="mb-4 text-xs text-[#8A8A8A]">先选音色再点麦克风，通话中不能换</p>
          <button
            type="button"
            onClick={() => void startCall()}
            disabled={phase === "connecting" || phase === "live"}
            data-live={phase === "live" ? "true" : "false"}
            className="call-orb"
            aria-label={callLabel}
          >
            <Mic size={28} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <p className="mt-4 text-sm text-[#6F6F6F]" role="status">
            {callLabel}
          </p>
          {partnerId ? <p className="mt-1 text-xs text-[#8A8A8A]">已连接到语音伙伴</p> : null}
          <p className="mt-3 max-w-sm text-center text-xs leading-5 text-[#8A8A8A]">{detail}</p>
          {phase === "error" ? (
            <button type="button" className="ink-btn-line mt-3 h-11 px-4 text-sm" onClick={() => void startCall()}>
              再试一次 · Retry
            </button>
          ) : null}
        </div>
      </section>
    );
  }
);
