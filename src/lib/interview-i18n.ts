// HireSense Interview Localization & Question Templates (i18n)
// Supports English ('en'), Hindi ('hi', Devanagari script), and Hinglish ('hinglish', Roman script).
// Respects Indian technical norms: English technical terms remain Latin/English in both Hindi and Hinglish.

export type InterviewLanguage = "en" | "hi" | "hinglish";

export interface StatusStrings {
  bableAsking: string;
  miraAsking: string; // Backward compatibility alias
  listening: string;
  listeningHint: string;
  couldNotHear: string;
  processing: string;
  preparingQuestion: string;
  reflectingOnAnswer: string;
  listeningToCandidate: string;
  micMuted: string;
  silentMicBanner: string;
  captionsUnavailable: string;
  tapStopWhenDone: string;
  recordAgain: string;
  typeAnswer: string;
  skipQuestion: string;
  submitAnswer: string;
  wordsTranscribed: string;
}

export const STATUS_TEXTS: Record<InterviewLanguage, StatusStrings> = {
  en: {
    bableAsking: "Bable is asking...",
    miraAsking: "Bable is asking...",
    listening: "Listening, answer now, then press the red button",
    listeningHint: "Answer verbally, then tap the red stop button.",
    couldNotHear: "We couldn't hear an answer.",
    processing: "Transcribing and scoring your answer...",
    preparingQuestion: "Preparing the question...",
    reflectingOnAnswer: "Reflecting on answer...",
    listeningToCandidate: "Listening to candidate...",
    micMuted: "Mic is muted. Unmute or type your answer.",
    silentMicBanner: "We can't hear your microphone. Check your input device.",
    captionsUnavailable: "Live captions unavailable. Your answer is still being recorded.",
    tapStopWhenDone: "Tap the red button when you're done.",
    recordAgain: "Record again",
    typeAnswer: "Type answer",
    skipQuestion: "Skip question",
    submitAnswer: "Submit answer",
    wordsTranscribed: "words transcribed",
  },
  hi: {
    bableAsking: "बेबल सवाल पूछ रहे हैं...",
    miraAsking: "बेबल सवाल पूछ रहे हैं...",
    listening: "सुन रहे हैं, अब जवाब दीजिए, फिर लाल बटन दबाएं",
    listeningHint: "बोलकर जवाब दीजिए, फिर लाल बटन दबाएं।",
    couldNotHear: "हम आपका जवाब सुन नहीं पाए।",
    processing: "जवाब को transcribe और score किया जा रहा है...",
    preparingQuestion: "सवाल तैयार किया जा रहा है...",
    reflectingOnAnswer: "जवाब का विश्लेषण हो रहा है...",
    listeningToCandidate: "उम्मीदवार को सुन रहे हैं...",
    micMuted: "माइक्रोफ़ोन म्यूट है। अनम्यूट करें या लिखकर जवाब दें।",
    silentMicBanner: "माइक्रोफ़ोन से आवाज़ नहीं आ रही है। अपना इनपुट डिवाइस चेक करें।",
    captionsUnavailable: "लाइव कैप्शन उपलब्ध नहीं हैं। आपकी आवाज़ रिकॉर्ड हो रही है।",
    tapStopWhenDone: "जवाब पूरा होने पर लाल बटन दबाएं।",
    recordAgain: "फिर से बोलें",
    typeAnswer: "लिखकर जवाब दें",
    skipQuestion: "सवाल छोड़ें",
    submitAnswer: "जवाब सबमिट करें",
    wordsTranscribed: "शब्द दर्ज हुए",
  },
  hinglish: {
    bableAsking: "Bable question pooch rahe hain...",
    miraAsking: "Bable question pooch rahe hain...",
    listening: "Listening, ab answer dijiye, phir red button dabaiye",
    listeningHint: "Boliye, phir done hone par red stop button tap kijiye.",
    couldNotHear: "Hum aapka answer sun nahi paaye.",
    processing: "Answer transcribe aur score ho raha hai...",
    preparingQuestion: "Question prepare ho raha hai...",
    reflectingOnAnswer: "Answer analyse ho raha hai...",
    listeningToCandidate: "Candidate ko sun rahe hain...",
    micMuted: "Mic muted hai. Unmute karein ya answer type karein.",
    silentMicBanner: "Aapke mic se sound detect nahi ho rahi. Input device check karein.",
    captionsUnavailable: "Live captions unavailable hain. Aapki audio record ho rahi hai.",
    tapStopWhenDone: "Answer complete hone par red button tap karein.",
    recordAgain: "Dubara record karein",
    typeAnswer: "Type answer",
    skipQuestion: "Skip question",
    submitAnswer: "Submit answer",
    wordsTranscribed: "words transcribe hue",
  },
};

/**
 * Question templates across 8 key interview dimensions.
 */
export const QUESTION_TEMPLATES = {
  intro: {
    en: (jobTitle: string, company: string) =>
      company && company !== "Company"
        ? `Hi, I'm Bable. Welcome to your interview for the ${jobTitle} position at ${company}. To start, please introduce yourself and tell me what excites you about this role.`
        : `Hi, I'm Bable. Welcome to your interview for the ${jobTitle} position. To start, please introduce yourself and tell me what excites you about this role.`,
    hi: (jobTitle: string, company: string) =>
      company && company !== "Company"
        ? `नमस्ते, मैं बेबल हूँ। ${company} में ${jobTitle} पद के इंटरव्यू में आपका स्वागत है। शुरू करने के लिए, कृपया अपना परिचय दीजिए और बताइए कि आपको इस भूमिका में रुचि क्यों है।`
        : `नमस्ते, मैं बेबल हूँ। ${jobTitle} पद के इंटरव्यू में आपका स्वागत है। शुरू करने के लिए, कृपया अपना परिचय दीजिए और बताइए कि आपको इस भूमिका में रुचि क्यों है।`,
    hinglish: (jobTitle: string, company: string) =>
      company && company !== "Company"
        ? `Hi, main Bable hoon. ${company} mein ${jobTitle} position ke interview mein aapka swagat hai. Shuru karne ke liye apna introduction dijiye aur batayiye ki aapko is role mein interest kyun hai?`
        : `Hi, main Bable hoon. ${jobTitle} position ke interview mein aapka swagat hai. Shuru karne ke liye apna introduction dijiye aur batayiye ki aapko is role mein interest kyun hai?`,
  },

  concept: {
    en: (skill: string) =>
      `Could you explain the core concepts of ${skill}, and discuss a common pitfall engineers encounter when working with it?`,
    hi: (skill: string) =>
      `${skill} के core concepts क्या हैं, और इसके साथ काम करते समय engineers आमतौर पर किस common pitfall का सामना करते हैं?`,
    hinglish: (skill: string) =>
      `${skill} ke core concepts kya hain, aur isme kaam karte waqt engineers usually kaunsi common pitfall encounter karte hain?`,
  },

  dsaConcept: {
    en: (skill: string) =>
      `In the context of data structures and algorithms with ${skill}: how do you choose between different structures, and how do you evaluate time and space complexity in practice?`,
    hi: (skill: string) =>
      `${skill} और data structures के context में: आप practical scenarios में algorithms के time और space complexity को कैसे evaluate करते हैं?`,
    hinglish: (skill: string) =>
      `${skill} aur data structures ke context mein: aap different structures ke beech kaise choose karte hain, aur time aur space complexity ko practical problems mein kaise evaluate karte hain?`,
  },

  applied: {
    en: (skill: string) =>
      `How have you used ${skill} in a real-world project? What was the technical problem, what approach did you take, and what was the outcome?`,
    hi: (skill: string) =>
      `आपने किसी project में ${skill} का practical use कैसे किया? Problem क्या थी, आपका technical approach क्या था, और outcome क्या रहा?`,
    hinglish: (skill: string) =>
      `Aapne ${skill} ko kisi project mein kaise use kiya? Problem kya thi, aapne kya approach liya, aur result kya raha?`,
  },

  tradeOff: {
    en: (skill: string) =>
      `When designing systems with ${skill}, what key technical trade-offs do you evaluate, and how do you decide between alternative architectural patterns?`,
    hi: (skill: string) =>
      `${skill} के साथ system architecture design करते समय आप कौनसे technical trade-offs देखते हैं, और alternative approaches में से सही choice कैसे करते हैं?`,
    hinglish: (skill: string) =>
      `${skill} ke saath architecture design karte waqt aap kaunse technical trade-offs evaluate karte hain, aur alternatives ke beech kaise decide karte hain?`,
  },

  resumeVerification: {
    en: (quote: string) =>
      `Your resume mentions "${quote}". What was your specific individual contribution to this, and what would you do differently today?`,
    hi: (quote: string) =>
      `आपके resume में लिखा है "${quote}"। इसमें आपका specific individual contribution क्या था, और आज आप इसे differently कैसे approach करेंगे?`,
    hinglish: (quote: string) =>
      `Aapke resume mein mentioned hai "${quote}". Isme aapka specific individual contribution kya tha, aur aaj aap isme kya differently karenge?`,
  },

  gapProbe: {
    en: (gap: string) =>
      `This role requires proficiency with ${gap}. How would you approach getting up to speed and becoming fully productive with it quickly?`,
    hi: (gap: string) =>
      `इस role के लिए ${gap} की आवश्यकता है। आप इसे सीखने और team में rapidly productive बनने के लिए क्या practical approach अपनाएंगे?`,
    hinglish: (gap: string) =>
      `Is role ke liye ${gap} required hai. Aap is technology ko jaldi learn karke team mein productive hone ke liye kya approach lenge?`,
  },

  scenario: {
    en: (responsibility: string) =>
      `Regarding the responsibility to "${responsibility}": how would you debug and triage a sudden failure in production, and communicate status with stakeholders?`,
    hi: (responsibility: string) =>
      `"${responsibility}" के संबंध में: अगर production में कोई unexpected failure आ जाए, तो आप उसे triage और debug कैसे करेंगे, और stakeholders से status कैसे communicate करेंगे?`,
    hinglish: (responsibility: string) =>
      `"${responsibility}" ke context mein: agar production mein sudden failure aa jaye, toh aap use triage aur debug kaise karenge, aur stakeholders ko status kaise communicate karenge?`,
  },

  closingLearning: {
    en: (skill: string) =>
      `To wrap up our interview: what is an engineering practice, tool, or area related to ${skill} that you have explored recently, and how has it influenced your work?`,
    hi: (skill: string) =>
      `इंटरव्यू समाप्त करने से पहले: हाल ही में आपने ${skill} या software engineering में कौनसी नई practice या tool explore किया, और इससे आपके काम में क्या सुधार हुआ?`,
    hinglish: (skill: string) =>
      `Wrap up karne ke liye: recently aapne ${skill} ya software engineering mein kaunsa naya tool ya practice explore kiya, aur isse aapke approach par kya impact pada?`,
  },
};
