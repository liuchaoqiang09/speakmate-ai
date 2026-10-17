import type { SpeakMateVoiceId } from "@/src/lib/volc/voices";

const VOICE_KEY = "speakmate-voice";
const CAPTIONS_KEY = "speakmate-captions-hidden";

export function readVoicePref(): SpeakMateVoiceId {
  try {
    const stored = window.localStorage.getItem(VOICE_KEY);
    return stored === "female" ? "female" : "male";
  } catch {
    return "male";
  }
}

export function writeVoicePref(voice: SpeakMateVoiceId) {
  try {
    window.localStorage.setItem(VOICE_KEY, voice);
  } catch {
    // ignore
  }
}

export function readCaptionsHiddenPref(): boolean {
  try {
    return window.localStorage.getItem(CAPTIONS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCaptionsHiddenPref(hidden: boolean) {
  try {
    window.localStorage.setItem(CAPTIONS_KEY, hidden ? "1" : "0");
  } catch {
    // ignore
  }
}
