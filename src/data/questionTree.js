// JSON-driven adaptive question graph for the Intake Flow

export const INTAKE_SECTIONS = [
  { id: 'chiefComplaint', title: 'Chief Complaint' },
  { id: 'hpiSocrates', title: 'History of Present Illness' },
  { id: 'pastHistory', title: 'Past Medical History' },
  { id: 'drugAllergy', title: 'Drugs & Allergies' },
  { id: 'familyHistory', title: 'Family History' },
  { id: 'personalHistory', title: 'Personal History' },
  { id: 'reviewOfSystems', title: 'Review of Systems' },
];

export const AYUSH_SECTIONS = [
  ...INTAKE_SECTIONS,
  { id: 'dashavidhaPariksha', title: 'Dashavidha Pariksha (Ayurveda)' },
];

export const QUESTION_TREE = {
  // --- CHIEF COMPLAINT ---
  q_initial: {
    id: 'q_initial',
    section: 'chiefComplaint',
    question: "What is your main problem today? Please tell me or select from the options.",
    type: 'both', // Voice and Chips
    options: [
      { label: "Chest Pain", nextId: 'q_socrates_site_chest' },
      { label: "Fever", nextId: 'q_hpi_fever_duration' },
      { label: "Headache", nextId: 'q_hpi_headache_type' },
      { label: "Stomach Pain", nextId: 'q_hpi_stomach_site' },
      { label: "Cough", nextId: 'q_hpi_cough_type' },
      { label: "Skin Rash", nextId: 'q_hpi_rash_site' },
    ],
    redFlagCheck: (answer) => null, // No immediate red flag on just the complaint, depends on associations
    stateUpdate: { key: 'chiefComplaint.main' }
  },

  // --- SOCRATES for Chest Pain ---
  q_socrates_site_chest: {
    id: 'q_socrates_site_chest',
    section: 'hpiSocrates',
    question: "Where exactly is the chest pain?",
    type: 'both',
    options: [
      { label: "Center of chest", nextId: 'q_socrates_onset' },
      { label: "Left side", nextId: 'q_socrates_onset' },
      { label: "Right side", nextId: 'q_socrates_onset' },
      { label: "All over", nextId: 'q_socrates_onset' }
    ],
    stateUpdate: { key: 'hpiSocrates.site' }
  },
  q_socrates_onset: {
    id: 'q_socrates_onset',
    section: 'hpiSocrates',
    question: "When did the pain start?",
    type: 'both',
    options: [
      { label: "Just now / less than an hour ago", nextId: 'q_socrates_character' },
      { label: "A few hours ago", nextId: 'q_socrates_character' },
      { label: "Yesterday", nextId: 'q_socrates_character' },
      { label: "A few days ago", nextId: 'q_socrates_character' }
    ],
    stateUpdate: { key: 'hpiSocrates.onset' }
  },
  q_socrates_character: {
    id: 'q_socrates_character',
    section: 'hpiSocrates',
    question: "What does the pain feel like?",
    type: 'both',
    options: [
      { label: "Heavy / Squeezing", nextId: 'q_socrates_radiation' },
      { label: "Sharp / Stabbing", nextId: 'q_socrates_radiation' },
      { label: "Burning", nextId: 'q_socrates_radiation' },
      { label: "Aching", nextId: 'q_socrates_radiation' }
    ],
    stateUpdate: { key: 'hpiSocrates.character' }
  },
  q_socrates_radiation: {
    id: 'q_socrates_radiation',
    section: 'hpiSocrates',
    question: "Does the pain move anywhere else?",
    type: 'both',
    options: [
      { label: "Left arm / shoulder", nextId: 'q_socrates_associations' },
      { label: "Jaw / Neck", nextId: 'q_socrates_associations' },
      { label: "Back", nextId: 'q_socrates_associations' },
      { label: "Stays in one place", nextId: 'q_socrates_associations' }
    ],
    stateUpdate: { key: 'hpiSocrates.radiation' }
  },
  q_socrates_associations: {
    id: 'q_socrates_associations',
    section: 'hpiSocrates',
    question: "Do you have any other symptoms with the pain?",
    type: 'both',
    options: [
      { label: "Sweating & Shortness of breath", nextId: 'q_socrates_timing' },
      { label: "Nausea / Vomiting", nextId: 'q_socrates_timing' },
      { label: "Dizziness", nextId: 'q_socrates_timing' },
      { label: "No other symptoms", nextId: 'q_socrates_timing' }
    ],
    stateUpdate: { key: 'hpiSocrates.associations' },
    redFlagCheck: (answer, context) => {
      // If Chest Pain + Sweating/SOB => trigger red flag alert!
      if (answer.includes('Sweating') || answer.includes('Shortness of breath')) {
        return "Acute chest pain + dyspnea — possible ACS";
      }
      return null;
    }
  },
  q_socrates_timing: {
    id: 'q_socrates_timing',
    section: 'hpiSocrates',
    question: "Is the pain constant or does it come and go?",
    type: 'both',
    options: [
      { label: "Constant", nextId: 'q_socrates_exacerbating' },
      { label: "Comes and goes", nextId: 'q_socrates_exacerbating' }
    ],
    stateUpdate: { key: 'hpiSocrates.timing' }
  },
  q_socrates_exacerbating: {
    id: 'q_socrates_exacerbating',
    section: 'hpiSocrates',
    question: "Does anything make the pain worse or better?",
    type: 'both',
    options: [
      { label: "Worse when walking/moving", nextId: 'q_socrates_severity' },
      { label: "Worse when breathing deep", nextId: 'q_socrates_severity' },
      { label: "Better with rest", nextId: 'q_socrates_severity' },
      { label: "Nothing changes it", nextId: 'q_socrates_severity' }
    ],
    stateUpdate: { key: 'hpiSocrates.exacerbating' }
  },
  q_socrates_severity: {
    id: 'q_socrates_severity',
    section: 'hpiSocrates',
    question: "On a scale of 1 to 10, how bad is the pain?",
    type: 'both',
    options: [
      { label: "1-3 (Mild)", nextId: 'q_past_medical' },
      { label: "4-6 (Moderate)", nextId: 'q_past_medical' },
      { label: "7-9 (Severe)", nextId: 'q_past_medical' },
      { label: "10 (Worst pain ever)", nextId: 'q_past_medical' }
    ],
    stateUpdate: { key: 'hpiSocrates.severity' }
  },

  // --- PAST MEDICAL HISTORY ---
  q_past_medical: {
    id: 'q_past_medical',
    section: 'pastHistory',
    question: "Do you have any existing medical conditions?",
    type: 'both',
    isMulti: true, // Allow multiple selections
    options: [
      { label: "Diabetes", nextId: null },
      { label: "High Blood Pressure", nextId: null },
      { label: "Asthma", nextId: null },
      { label: "Heart Disease", nextId: null },
      { label: "None", nextId: null },
    ],
    nextId: 'q_surgical_history', // Fixed next step regardless of option
    stateUpdate: { key: 'pastHistory.medical' }
  },
  q_surgical_history: {
    id: 'q_surgical_history',
    section: 'pastHistory',
    question: "Have you ever had any surgeries?",
    type: 'both',
    options: [
      { label: "Yes", nextId: 'q_drug_history' }, // For demo, simplifying
      { label: "No", nextId: 'q_drug_history' }
    ],
    stateUpdate: { key: 'pastHistory.surgical' }
  },

  // --- DRUG & ALLERGY HISTORY ---
  q_drug_history: {
    id: 'q_drug_history',
    section: 'drugAllergy',
    question: "Are you currently taking any medicines daily?",
    type: 'both',
    options: [
      { label: "Yes, I will tell you / type", nextId: 'q_allergy_history' },
      { label: "I have uploaded a prescription", nextId: 'q_allergy_history' },
      { label: "No medicines", nextId: 'q_allergy_history' }
    ],
    stateUpdate: { key: 'drugHistory.current' }
  },
  q_allergy_history: {
    id: 'q_allergy_history',
    section: 'drugAllergy',
    question: "Do you have any allergies to medicines or food?",
    type: 'both',
    options: [
      { label: "Yes, to medicines", nextId: 'q_family_history' },
      { label: "Yes, to some foods", nextId: 'q_family_history' },
      { label: "No allergies", nextId: 'q_family_history' }
    ],
    stateUpdate: { key: 'allergyHistory.drugAllergies' }
  },

  // --- FAMILY HISTORY ---
  q_family_history: {
    id: 'q_family_history',
    section: 'familyHistory',
    question: "Does anyone in your family (parents, siblings) have serious illnesses like Diabetes or Heart Disease?",
    type: 'both',
    options: [
      { label: "Yes, Diabetes", nextId: 'q_personal_history' },
      { label: "Yes, Heart Disease", nextId: 'q_personal_history' },
      { label: "Yes, both", nextId: 'q_personal_history' },
      { label: "No / Not sure", nextId: 'q_personal_history' }
    ],
    stateUpdate: { key: 'familyHistory.general' }
  },

  // --- PERSONAL HISTORY ---
  q_personal_history: {
    id: 'q_personal_history',
    section: 'personalHistory',
    question: "Do you smoke or consume alcohol?",
    type: 'both',
    options: [
      { label: "Smoking only", nextId: 'q_ros' },
      { label: "Alcohol only", nextId: 'q_ros' },
      { label: "Both", nextId: 'q_ros' },
      { label: "Neither", nextId: 'q_ros' }
    ],
    stateUpdate: { key: 'personalHistory.habits' }
  },

  // --- REVIEW OF SYSTEMS ---
  q_ros: {
    id: 'q_ros',
    section: 'reviewOfSystems',
    question: "Are you experiencing any other issues like weight loss, fever, or change in appetite?",
    type: 'both',
    options: [
      { label: "Weight Loss", nextId: 'q_ayush_check' },
      { label: "Loss of appetite", nextId: 'q_ayush_check' },
      { label: "Fever/Chills", nextId: 'q_ayush_check' },
      { label: "No other issues", nextId: 'q_ayush_check' }
    ],
    stateUpdate: { key: 'reviewOfSystems.general' }
  },

  // --- AYUSH DYNAMIC CHECK ---
  q_ayush_check: {
    id: 'q_ayush_check',
    section: 'reviewOfSystems', // Technically a silent node
    isSilent: true, // UI doesn't render this question directly, it routes based on context
    evaluateNext: (context) => {
      return context.ayushMode ? 'q_ayurveda_prakriti' : 'END';
    }
  },

  // --- AYURVEDA: Dashavidha Pariksha (Sample) ---
  q_ayurveda_prakriti: {
    id: 'q_ayurveda_prakriti',
    section: 'dashavidhaPariksha',
    question: "How would you describe your body frame and weight tendency? (Prakriti)",
    type: 'both',
    options: [
      { label: "Thin, hard to gain weight (Vata)", nextId: 'q_ayurveda_agni' },
      { label: "Medium build, easily irritated (Pitta)", nextId: 'q_ayurveda_agni' },
      { label: "Heavy build, easy weight gain (Kapha)", nextId: 'q_ayurveda_agni' }
    ],
    stateUpdate: { key: 'dashavidhaPariksha.prakriti' }
  },
  q_ayurveda_agni: {
    id: 'q_ayurveda_agni',
    section: 'dashavidhaPariksha',
    question: "How is your digestion and appetite? (Agni)",
    type: 'both',
    options: [
      { label: "Irregular, lots of gas (Vishamagni)", nextId: 'q_ayurveda_koshtha' },
      { label: "Strong, burning sensation (Tikshnagni)", nextId: 'q_ayurveda_koshtha' },
      { label: "Slow, feeling heavy after eating (Mandagni)", nextId: 'q_ayurveda_koshtha' },
      { label: "Normal, balanced (Samagni)", nextId: 'q_ayurveda_koshtha' }
    ],
    stateUpdate: { key: 'dashavidhaPariksha.agni' }
  },
  q_ayurveda_koshtha: {
    id: 'q_ayurveda_koshtha',
    section: 'dashavidhaPariksha',
    question: "How are your bowel movements? (Koshtha)",
    type: 'both',
    options: [
      { label: "Hard, tendency for constipation", nextId: 'END' },
      { label: "Soft, tendency for loose motions", nextId: 'END' },
      { label: "Regular and well-formed", nextId: 'END' }
    ],
    stateUpdate: { key: 'dashavidhaPariksha.koshtha' }
  },

  // Placeholder branching for other complaints
  q_hpi_fever_duration: {
    id: 'q_hpi_fever_duration',
    section: 'hpiSocrates',
    question: "How long have you had the fever?",
    type: 'both',
    options: [{ label: "Skip to Past Medical History for demo", nextId: 'q_past_medical' }]
  },
  q_hpi_headache_type: {
    id: 'q_hpi_headache_type',
    section: 'hpiSocrates',
    question: "Where is the headache?",
    type: 'both',
    options: [{ label: "Skip to Past Medical History for demo", nextId: 'q_past_medical' }]
  },
  q_hpi_stomach_site: {
    id: 'q_hpi_stomach_site',
    section: 'hpiSocrates',
    question: "Where is the stomach pain?",
    type: 'both',
    options: [{ label: "Skip to Past Medical History for demo", nextId: 'q_past_medical' }]
  },
  q_hpi_cough_type: {
    id: 'q_hpi_cough_type',
    section: 'hpiSocrates',
    question: "Is it a dry cough or with phlegm?",
    type: 'both',
    options: [{ label: "Skip to Past Medical History for demo", nextId: 'q_past_medical' }]
  },
  q_hpi_rash_site: {
    id: 'q_hpi_rash_site',
    section: 'hpiSocrates',
    question: "Where is the rash?",
    type: 'both',
    options: [{ label: "Skip to Past Medical History for demo", nextId: 'q_past_medical' }]
  },

};
