export type GeneralScene = {
  welcome: string;
  role: string;
  goals: string[];
  hints: string[];
};

type SceneDraft = {
  welcome: string;
  role: string;
  goals: string[];
  hints: string[];
};

const FREE_TALK: SceneDraft = {
  welcome: "Hi. I'm SpeakMate. What do you feel like talking about?",
  role: "This is an open conversation. Follow the learner's topic. Do not force a shop, hotel, interview, or other fixed scene.",
  goals: ["Say what you want to talk about", "Give one reason", "Ask one question back"],
  hints: ["I feel like talking about...", "The reason is...", "What about you?"],
};

const SCENES: Record<string, SceneDraft> = {
  日常生活: {
    welcome: "Hey. I just got home. How was your day?",
    role: "You are a friend talking about daily life: home, meals, routines, and the weekend. Stay in that chat.",
    goals: ["Describe today", "Mention one meal or routine", "Talk about the weekend", "Compare today with a usual day"],
    hints: ["I usually...", "For lunch I...", "This weekend I'm going to..."],
  },
  自我介绍: {
    welcome: "Hi, nice to meet you. I'm Jordan. What should I call you?",
    role: "You just met the learner. Help them introduce themselves. Ask one detail at a time. Stay in this first meeting.",
    goals: ["Say your name", "Say where you are from", "Mention study or work", "Name one hobby and why you like it"],
    hints: ["My name is...", "I'm from...", "In my free time I..."],
  },
  餐厅点餐: {
    welcome: "Good evening. Welcome. Can I start you with something to drink?",
    role: "You are a restaurant server. Take the order. Stay in the restaurant.",
    goals: ["Order a drink", "Order a dish", "Mention an allergy or a preference", "Ask for the check"],
    hints: ["I'd like a glass of...", "I'm allergic to...", "Can I get the check?"],
  },
  酒店入住: {
    welcome: "Good afternoon. Welcome to the front desk. Are you checking in today?",
    role: "You are the hotel receptionist. Stay at the front desk.",
    goals: ["Give the reservation name", "Confirm the room", "Ask about breakfast", "Ask for a wake-up call or a room change"],
    hints: ["The reservation is under...", "What time is breakfast?", "Could I get a wake-up call?"],
  },
  购物: {
    welcome: "Hi there. Welcome in. What are you hoping to find today?",
    role: "You are a shop assistant. Stay in the shop.",
    goals: ["Name the item", "Ask the price", "Ask about size or color", "Ask to try it on"],
    hints: ["How much is this?", "Do you have this in a larger size?", "Can I try it on?"],
  },
  旅行: {
    welcome: "So, the trip starts now. Which city are we visiting first?",
    role: "You are a travel partner. Stay on the trip.",
    goals: ["Name the city", "Choose transport", "Pick one sight", "Plan the rest of the day"],
    hints: ["Let's go to...", "We can take the train.", "After that, we could..."],
  },
  学习与工作: {
    welcome: "Hey. Before we start, are you here for class, or for work?",
    role: "You are a classmate or colleague. Stay on study or work.",
    goals: ["Say class or work", "Name the task", "Mention a deadline", "Ask for help or offer help"],
    hints: ["I'm working on...", "It's due on...", "Could you help me with...?"],
  },
  求职面试: {
    welcome: "Thank you for coming in. Please sit down. Tell me a little about yourself.",
    role: "You are a job interviewer. Ask one interview question at a time. Stay in the interview.",
    goals: ["Introduce yourself", "Describe one experience", "Name a strength", "Say why you want the role"],
    hints: ["I have experience in...", "One strength is...", "I'd like this role because..."],
  },
  自由对话: FREE_TALK,
};

function goalCount(difficulty?: string | null): number {
  if (difficulty === "初级") {
    return 2;
  }
  if (difficulty === "高级") {
    return 4;
  }
  return 3;
}

export function generalScene(topic?: string | null, difficulty?: string | null): GeneralScene {
  const draft = SCENES[topic?.trim() || ""] || FREE_TALK;
  const goals = draft.goals.slice(0, goalCount(difficulty));
  return {
    welcome: draft.welcome,
    role: `${draft.role} The learner should cover these goals, one at a time: ${goals.join("; ")}.`,
    goals,
    hints: draft.hints,
  };
}
