export const SPEAKMATE_VOICES = {
  male: {
    id: "male",
    label: "Male",
    labelZh: "男声",
    speaker: "ICL_uranus_en_male_michael_tob",
  },
  female: {
    id: "female",
    label: "Female",
    labelZh: "女声",
    speaker: "ICL_uranus_en_female_charlie_tob",
  },
} as const;

export type SpeakMateVoiceId = keyof typeof SPEAKMATE_VOICES;

export function resolveSpeaker(voice: string | undefined): string {
  if (voice === "female") {
    return SPEAKMATE_VOICES.female.speaker;
  }
  return SPEAKMATE_VOICES.male.speaker;
}
