export interface TranslationEntry {
    native: string;
    target: string; // Darija reference text; other languages are generated at runtime
    tier: number; // 0-100: Percentage at which this term switches to target language
}

export type TranslationKey =
    | 'nav_home'
    | 'nav_map'
    | 'nav_profile'
    | 'btn_start'
    | 'btn_close'
    | 'lbl_objective'
    | 'lbl_lore'
    | 'lbl_streak'
    | 'lbl_xp'
    | 'lbl_chapter'
    | 'lbl_mission'
    | 'lbl_knowledge'
    | 'city_gate'
    | 'city_market'
    | 'city_palace'
    | 'lbl_start_here'
    | 'lbl_distance'
    | 'lbl_days'
    | 'lore_desert'
    | 'lore_mountain'
    | 'lore_forest'
    | 'lbl_episode'
    | 'lbl_reward'
    | 'btn_replay'
    | 'lbl_monologue'
    | 'lbl_hero_journal'
    | 'lbl_unknown_dest'
    | 'lbl_charting'
    | 'ep_gates_title'
    | 'ep_intro'
    | 'less_silent_guard'
    | 'less_silent_ctx'
    | 'less_silent_obj'
    | 'less_merchant'
    | 'less_merchant_ctx'
    | 'less_captain'
    | 'less_captain_ctx'
    | 'less_captain_ctx'
    | 'lbl_monologue_text'
    | 'lbl_how_to_play';

// Tier ladder: 30% concrete nouns → 40-50% titles & short labels →
// 60-70% descriptions & UI chrome → 80% buttons/instructions → 90% long prose.
export const dictionary: Record<TranslationKey, TranslationEntry> = {
    // Navigation
    nav_home: { native: 'Home', target: 'Dar (دار)', tier: 60 },
    nav_map: { native: 'Map', target: 'Kharita (خريطة)', tier: 60 },
    nav_profile: { native: 'Profile', target: 'Wajh (وجه)', tier: 60 },

    // Common Buttons
    btn_start: { native: 'Begin Adventure', target: 'Bda Moughamara (بدأ المغامرة)', tier: 80 },
    btn_close: { native: 'Close', target: 'Sedd (سد)', tier: 80 },

    // Labels
    lbl_objective: { native: 'Current Objective', target: 'Hadaf Hali (هدف حالي)', tier: 70 },
    lbl_lore: { native: 'Region Lore', target: 'Asatir Mintaqa (أساطير المنطقة)', tier: 70 },
    lbl_streak: { native: 'Day Streak', target: 'Tatabu (تتابع)', tier: 60 },
    lbl_xp: { native: 'Total XP', target: 'Majmou XP (مجموع XP)', tier: 60 },

    // Lesson Specific
    lbl_chapter: { native: 'Chapters', target: 'Fousoul (فصول)', tier: 70 },
    lbl_mission: { native: 'Mission Brief', target: 'Mouhimma (مهمة)', tier: 70 },
    lbl_knowledge: { native: 'Knowledge Required', target: 'Ma\'rifa Matlouba (معرفة مطلوبة)', tier: 80 },

    // City Locations (concrete nouns — first to flip)
    city_gate: { native: 'The Gate', target: 'Bab (باب)', tier: 30 },
    city_market: { native: 'The Market', target: 'Souq (سوق)', tier: 30 },
    city_palace: { native: 'The Palace', target: 'Qsar (قصر)', tier: 30 },

    // Map UI
    lbl_start_here: { native: 'Start Here!', target: 'Bda Hna! (بدا هنا!)', tier: 40 },
    lbl_distance: { native: 'Distance', target: 'Masafa (مسافة)', tier: 50 },
    lbl_days: { native: 'Days', target: 'Ayyam (أيام)', tier: 50 },

    // Biome Lore (long prose — last to flip)
    lore_desert: {
        native: "The Whispering Sands hold secrets of an ancient empire. Only those who master the language of the sun can find the hidden oases.",
        target: "Rimal al-Hamsa tahmil asrar imbaratoriya qadima. Faqat man yutqin lughat al-shams yajid al-wahat al-makhfiya. (الرمال الهامسة تحمل أسرار إمبراطورية قديمة. فقط من يتقن لغة الشمس يجد الواحات المخفية.)",
        tier: 90
    },
    lore_mountain: {
        native: "The Cloud-Piercing Peaks are treacherous. The monks here speak in riddles, testing the wisdom of every traveler.",
        target: "Al-Qimam al-Thaqiba lil-Sahab khatira. Al-ruhban huna yatahaddathun bil-alghaz, yakhtabirun hikmat kull musafir. (القمم الثاقبة للسحاب خطيرة. الرهبان هنا يتحدثون بالألغاز، يختبرون حكمة كل مسافر.)",
        tier: 90
    },
    lore_forest: {
        native: "The Emerald Woods are alive with magic. Listen closely to the rustling leaves; they whisper words of power to those who listen.",
        target: "Al-Ghabat al-Zumurrudiya hayya bil-sihr. Istami' jayyidan li-hafif al-awraq; hiya tahmis kalimat al-quwwa li-man yastami'. (الغابات الزمردية حية بالسحر. استمع جيدا لحفيف الأوراق؛ هي تهمس كلمات القوة لمن يستمع.)",
        tier: 90
    },

    // City View UI
    lbl_episode: { native: 'Episode', target: 'Halqa (حلقة)', tier: 60 },
    lbl_reward: { native: 'Reward', target: 'Mukafa\'a (مكافأة)', tier: 60 },
    btn_replay: { native: 'Replay', target: 'A\'id (أعد)', tier: 80 },
    lbl_monologue: { native: "Hero's Inner Monologue", target: "Munajat al-Batal (مناجاة البطل)", tier: 80 },

    // Saga Map Strings
    lbl_hero_journal: { native: "Hero's Journal", target: "Yawmiyat al-Batal (يوميات البطل)", tier: 70 },
    lbl_unknown_dest: { native: "Unknown Destination", target: "Wijha Majhoula (وجهة مجهولة)", tier: 80 },
    lbl_charting: { native: "Charting the Unknown Lands...", target: "Rasm al-Aradi al-Majhoula... (رسم الأراضي المجهولة...)", tier: 80 },
    lbl_how_to_play: { native: 'How to Play', target: 'Kifash Tel3ab (كيفاش تلعب)', tier: 80 },

    // Mock Episode Content
    ep_gates_title: { native: "The Gates of", target: "Abwab (أبواب)", tier: 30 },
    ep_intro: { native: "You arrive at the legendary city, tired and thirsty. But the guards are turning strangers away.", target: "Tasilo ila al-madina al-usturiya, mut'aban wa atchan. Lakin al-hurras yamna'oun al-ghuraba'. (تصل إلى المدينة الأسطورية، متعبا وعطشانا. لكن الحراس يمنعون الغرباء.)", tier: 50 },

    // Mock Lessons
    less_silent_guard: { native: "The Silent Guard", target: "Al-Haris al-Samit (الحارس الصامت)", tier: 40 },
    less_silent_ctx: { native: "A guard points to a sign hanging on the gate. You need to read it to understand the rules.", target: "Yushiru haris ila lafita mu'allaqa 'ala al-bab. Yajib an taqra'aha li-tafham al-qawa'id. (يشير حارس إلى لافتة معلقة على الباب. يجب أن تقرأها لتفهم القواعد.)", tier: 60 },
    less_silent_obj: { native: "Basic Nouns (Gate, Water)", target: "Asma' Asasiya (Bab, Ma') (أسماء أساسية: باب، ماء)", tier: 70 },

    less_merchant: { native: "The Merchant's Advice", target: "Nasihat al-Tajir (نصيحة التاجر)", tier: 40 },
    less_merchant_ctx: { native: "An old merchant waiting nearby sees your confusion. He whispers a phrase to help you.", target: "Yara tajir ajouz hayratak. Yahmis laka bi-ibara li-yusa'idak. (يرى تاجر عجوز حيرتك. يهمس لك بعبارة ليساعدك.)", tier: 60 },

    less_captain: { native: "The Captain's Test", target: "Ikhtibar al-Qa'id (اختبار القائد)", tier: 40 },
    less_captain_ctx: { native: "The Captain approaches. He looks suspicious. Use the Merchant's advice to pass.", target: "Yaqtarib al-Qa'id. Yabdu muriban. Istakhdim nasihat al-tajir li-tamurr. (يقترب القائد. يبدو مريبا. استخدم نصيحة التاجر لتمر.)", tier: 60 },

    lbl_monologue_text: { native: "I need to find a way into the city. That guard looks stern, but maybe there's a way to talk to him...", target: "Ahtaju ila ijad tariqa li-dukhul al-madina. Dhalika al-haris yabdu sariman, lakin rubbama hunaka tariqa lil-tahadduth ma'ahu... (أحتاج إلى إيجاد طريقة لدخول المدينة. ذلك الحارس يبدو صارما، لكن ربما هناك طريقة للتحدث معه...)", tier: 70 },
};
