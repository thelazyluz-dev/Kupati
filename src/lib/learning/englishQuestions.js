function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const GRADE1 = [
  { q: '🐕\nמה זה באנגלית?', opts: ['dog','cat','fish','bird'], a: 0 },
  { q: '🐈\nמה זה באנגלית?', opts: ['cat','dog','rabbit','mouse'], a: 0 },
  { q: '🐟\nמה זה באנגלית?', opts: ['fish','bird','frog','snake'], a: 0 },
  { q: '🐦\nמה זה באנגלית?', opts: ['bird','fish','cat','dog'], a: 0 },
  { q: '🔴\nאיזה צבע?', opts: ['red','blue','green','yellow'], a: 0 },
  { q: '🔵\nאיזה צבע?', opts: ['blue','red','green','orange'], a: 0 },
  { q: '🟢\nאיזה צבע?', opts: ['green','blue','red','purple'], a: 0 },
  { q: '🟡\nאיזה צבע?', opts: ['yellow','orange','blue','pink'], a: 0 },
  { q: '🍎\nמה זה באנגלית?', opts: ['apple','orange','banana','grape'], a: 0 },
  { q: '🍌\nמה זה באנגלית?', opts: ['banana','apple','mango','orange'], a: 0 },
  { q: '👁️\nמה זה באנגלית?', opts: ['eye','ear','nose','mouth'], a: 0 },
  { q: '👂\nמה זה באנגלית?', opts: ['ear','eye','hand','nose'], a: 0 },
  { q: '👃\nמה זה באנגלית?', opts: ['nose','ear','eye','mouth'], a: 0 },
  { q: '🤚\nמה זה באנגלית?', opts: ['hand','foot','head','arm'], a: 0 },
  { q: '🌞\nמה זה באנגלית?', opts: ['sun','moon','star','cloud'], a: 0 },
  { q: '🌙\nמה זה באנגלית?', opts: ['moon','sun','star','cloud'], a: 0 },
  { q: '🏠\nמה זה באנגלית?', opts: ['house','school','shop','park'], a: 0 },
  { q: '📚\nמה זה באנגלית?', opts: ['book','pen','bag','table'], a: 0 },
]

const GRADE2 = [
  { q: '🚗\nמה זה באנגלית?', opts: ['car','bus','train','bike'], a: 0 },
  { q: '🚌\nמה זה באנגלית?', opts: ['bus','car','train','truck'], a: 0 },
  { q: '✈️\nמה זה באנגלית?', opts: ['plane','helicopter','rocket','ship'], a: 0 },
  { q: '🍕\nמה זה באנגלית?', opts: ['pizza','pasta','bread','cake'], a: 0 },
  { q: '🎂\nמה זה באנגלית?', opts: ['cake','bread','cookie','muffin'], a: 0 },
  { q: '🥛\nמה זה באנגלית?', opts: ['milk','juice','water','tea'], a: 0 },
  { q: '☀️\nאיזה מזג אוויר?', opts: ['sunny','rainy','cloudy','windy'], a: 0 },
  { q: '🌧️\nאיזה מזג אוויר?', opts: ['rainy','sunny','cloudy','snowy'], a: 0 },
  { q: '❄️\nאיזה מזג אוויר?', opts: ['snowy','sunny','rainy','windy'], a: 0 },
  { q: '🦁\nמה זה באנגלית?', opts: ['lion','tiger','bear','wolf'], a: 0 },
  { q: '🐘\nמה זה באנגלית?', opts: ['elephant','hippo','rhino','giraffe'], a: 0 },
  { q: '🦒\nמה זה באנגלית?', opts: ['giraffe','zebra','elephant','camel'], a: 0 },
  { q: '👨\nמה זה באנגלית?', opts: ['father','mother','brother','uncle'], a: 0 },
  { q: '👩\nמה זה באנגלית?', opts: ['mother','father','sister','aunt'], a: 0 },
  { q: '📝\nמה זה באנגלית?', opts: ['pen','book','table','bag'], a: 0 },
  { q: '🎒\nמה זה באנגלית?', opts: ['bag','book','pen','box'], a: 0 },
  { q: '🐇\nמה זה באנגלית?', opts: ['rabbit','hamster','mouse','squirrel'], a: 0 },
  { q: '🍊\nמה זה באנגלית?', opts: ['orange','lemon','mango','peach'], a: 0 },
]

const GRADE3 = [
  { q: '😊\nאיזה רגש?', opts: ['happy','sad','angry','scared'], a: 0 },
  { q: '😢\nאיזה רגש?', opts: ['sad','happy','angry','surprised'], a: 0 },
  { q: '😠\nאיזה רגש?', opts: ['angry','happy','sad','scared'], a: 0 },
  { q: '🏃\nאיזו פעולה?', opts: ['run','swim','fly','jump'], a: 0 },
  { q: '🏊\nאיזו פעולה?', opts: ['swim','run','jump','sleep'], a: 0 },
  { q: '😴\nאיזו פעולה?', opts: ['sleep','eat','drink','play'], a: 0 },
  { q: '👨‍🏫\nמה המקצוע?', opts: ['teacher','doctor','chef','pilot'], a: 0 },
  { q: '👨‍⚕️\nמה המקצוע?', opts: ['doctor','teacher','lawyer','engineer'], a: 0 },
  { q: '👨‍🍳\nמה המקצוע?', opts: ['chef','waiter','baker','farmer'], a: 0 },
  { q: '🐋\nמה זה באנגלית?', opts: ['whale','dolphin','shark','seal'], a: 0 },
  { q: '🦊\nמה זה באנגלית?', opts: ['fox','wolf','dog','bear'], a: 0 },
  { q: '🌸\nמה זה באנגלית?', opts: ['flower','tree','leaf','grass'], a: 0 },
  { q: 'מה ההפך של "big"?', opts: ['small','tall','heavy','slow'], a: 0 },
  { q: 'מה ההפך של "hot"?', opts: ['cold','warm','cool','wet'], a: 0 },
  { q: 'מה ההפך של "fast"?', opts: ['slow','calm','quiet','soft'], a: 0 },
  { q: '🏔️\nמה זה באנגלית?', opts: ['mountain','hill','valley','volcano'], a: 0 },
  { q: '🌊\nמה זה באנגלית?', opts: ['wave','river','lake','pond'], a: 0 },
  { q: '⭐\nמה זה באנגלית?', opts: ['star','sun','moon','planet'], a: 0 },
]

const GRADE4 = [
  { q: '🏥\nמה זה באנגלית?', opts: ['hospital','school','library','station'], a: 0 },
  { q: '🏛️\nמה זה באנגלית?', opts: ['museum','library','palace','temple'], a: 0 },
  { q: '🏜️\nמה זה באנגלית?', opts: ['desert','forest','jungle','swamp'], a: 0 },
  { q: '🌲\nמה זה באנגלית?', opts: ['forest','desert','mountain','ocean'], a: 0 },
  { q: '🏝️\nמה זה באנגלית?', opts: ['island','beach','reef','coast'], a: 0 },
  { q: '🔭\nמה זה באנגלית?', opts: ['telescope','microscope','binoculars','camera'], a: 0 },
  { q: '🔬\nמה זה באנגלית?', opts: ['microscope','telescope','calculator','thermometer'], a: 0 },
  { q: '🧲\nמה זה באנגלית?', opts: ['magnet','battery','wire','switch'], a: 0 },
  { q: 'מה פירוש "ancient"?', opts: ['עַתִּיק','מוֹדֶרְנִי','קָטָן','יָקָר'], a: 0 },
  { q: 'מה פירוש "enormous"?', opts: ['עָצוּם','קָטָן','מָהִיר','חַלָּשׁ'], a: 0 },
  { q: 'מה פירוש "brave"?', opts: ['אַמִּיץ','פַּחְדָן','חָכָם','חָזָק'], a: 0 },
  { q: '🦅\nמה זה באנגלית?', opts: ['eagle','hawk','owl','crow'], a: 0 },
  { q: '🦋\nמה זה באנגלית?', opts: ['butterfly','moth','dragonfly','bee'], a: 0 },
  { q: '🌋\nמה זה באנגלית?', opts: ['volcano','mountain','canyon','geyser'], a: 0 },
  { q: 'מה פירוש "invisible"?', opts: ['בִּלְתִּי נִרְאֶה','שְׁקוּפִי','חֲשׁוּאִי','קָטָן'], a: 0 },
  { q: 'מה פירוש "curious"?', opts: ['סַקְרָנִי','עָיֵף','שָׂמֵחַ','כּוֹעֵס'], a: 0 },
  { q: '🧩\nמה זה באנגלית?', opts: ['puzzle','game','toy','board'], a: 0 },
  { q: 'מה פירוש "harvest"?', opts: ['קְצִיר','זְרִיעָה','גִּדּוּל','מֶזֶג אֲוִיר'], a: 0 },
]

const GRADE5 = [
  { q: 'What is the opposite of "ancient"?', opts: ['modern','old','classic','historic'], a: 0 },
  { q: 'What does "generous" mean?', opts: ['נְדִיב','קַמְצָן','חָכָם','גִּבּוֹר'], a: 0 },
  { q: 'What does "explore" mean?', opts: ['לַחְקֹר','לִבְרֹחַ','לִישֹׁן','לֶאֱכֹל'], a: 0 },
  { q: 'What does "fragile" mean?', opts: ['שָׁבִיר','חָזָק','כָּבֵד','גָּדוֹל'], a: 0 },
  { q: 'What does "magnify" mean?', opts: ['לְהַגְדִּיל','לְהַקְטִין','לִסְגֹּר','לִמְצֹא'], a: 0 },
  { q: 'Choose the correct word:\nThe sky is ___.',  opts: ['cloudy','cloudly','cloudful','cloudish'], a: 0 },
  { q: 'What does "predict" mean?', opts: ['לְנַבֵּא','לִזְכֹּר','לְסַפֵּר','לִשְׁאֹל'], a: 0 },
  { q: 'What is a synonym for "happy"?', opts: ['joyful','sad','angry','tired'], a: 0 },
  { q: 'What is a synonym for "big"?', opts: ['large','tiny','thin','short'], a: 0 },
  { q: 'What does "preserve" mean?', opts: ['לְשָׁמֵר','לְהַשְׁמִיד','לִמְכֹּר','לְשַׁנּוֹת'], a: 0 },
  { q: 'What does "scarce" mean?', opts: ['נָדִיר','שָׁכִיחַ','גָּדוֹל','יְקָר'], a: 0 },
  { q: 'What does "collaborate" mean?', opts: ['לְשַׁתֵּף פְּעֻלָּה','לְהִתְחָרוֹת','לְהִתְנַגֵּד','לְהֵפָּרֵד'], a: 0 },
  { q: 'What is the plural of "child"?', opts: ['children','childs','childes','child'], a: 0 },
  { q: 'What does "migrate" mean?', opts: ['לְנַדֵּד','לִישֹׁן','לִצְמֹחַ','לְהִתְחַבֵּא'], a: 0 },
  { q: 'What does "drought" mean?', opts: ['בַּצֹּרֶת','שִׁטָּפוֹן','סְעָרָה','שֶׁלֶג'], a: 0 },
  { q: 'What is an antonym for "brave"?', opts: ['cowardly','strong','bold','fierce'], a: 0 },
  { q: 'What does "navigate" mean?', opts: ['לְנַוֵּט','לְנַהֵל','לִנְבּוֹחַ','לְנַצֵּחַ'], a: 0 },
  { q: 'What does "absorb" mean?', opts: ['לִסְפֹּג','לְשַׁחְרֵר','לְסַנֵּן','לְבַשֵּׁל'], a: 0 },
]

const GRADE6 = [
  { q: 'What does "ambitious" mean?', opts: ['שְׁאַפְתָּן','עָצֵל','שָׁלֵו','מְרֻצֶּה'], a: 0 },
  { q: 'What does "catastrophe" mean?', opts: ['אָסוֹן','נִצָּחוֹן','הַפְתָּעָה','שִׂמְחָה'], a: 0 },
  { q: 'What does "democracy" mean?', opts: ['דֵּמוֹקְרַטְיָה','דִּיקְטָטוּרָה','מַלוּכָה','אֲנַרְכְיָה'], a: 0 },
  { q: 'What does "evolve" mean?', opts: ['לְהִתְפַּתֵּחַ','לְהִתְכַּוֵּץ','לְהִתְפּוֹצֵץ','לְהִתְפַּזֵּר'], a: 0 },
  { q: 'What does "eloquent" mean?', opts: ['נוֹאֵם בְּכִשְׁרוֹן','שׁוֹתֵק','מְבֻלְבָּל','נֶרְוָנִי'], a: 0 },
  { q: 'What is a synonym for "intelligent"?', opts: ['clever','silly','lazy','slow'], a: 0 },
  { q: 'What does "epidemic" mean?', opts: ['מַגֵּפָה','הִתְפּוֹצְצוּת','בַּצֹּרֶת','רַעַשׁ אֲדָמָה'], a: 0 },
  { q: 'What does "persevere" mean?', opts: ['לְהִתְמִיד','לִוְּתֵר','לְהִתְפַּשֵּׁר','לְהִתְרַשֵּׁל'], a: 0 },
  { q: 'What does "conscientious" mean?', opts: ['מַצְפּוּנִי','אַדִּישׁ','בּוֹגֵד','רַשְׁלָן'], a: 0 },
  { q: 'What does "hypothesis" mean?', opts: ['הַשְׁעָרָה','הוֹכָחָה','מַסְקָנָה','תְּגָלִית'], a: 0 },
  { q: 'What does "unanimous" mean?', opts: ['פֶּה אֶחָד','מְחוּלָק','שׁוֹנֶה','מְעוּרְבָּב'], a: 0 },
  { q: 'What does "inevitable" mean?', opts: ['בִּלְתִּי נִמְנָע','אֶפְשָׁרִי','מְפַתִּיעַ','זְמַנִּי'], a: 0 },
  { q: 'What does "phenomenon" mean?', opts: ['תּוֹפָעָה','בְּעָיָה','פִּתָּרוֹן','מִקְרֶה'], a: 0 },
  { q: 'What is an antonym for "transparent"?', opts: ['opaque','clear','shiny','smooth'], a: 0 },
  { q: 'What does "controversy" mean?', opts: ['מַחֲלֹקֶת','הֶסְכֵּם','שֶׁקֶט','אַחְדוּת'], a: 0 },
  { q: 'What does "sustainable" mean?', opts: ['בַּר-קַיָּמָא','הָרְסָנִי','זְמַנִּי','מְיֻשָּׁן'], a: 0 },
  { q: 'What does "renaissance" mean?', opts: ['תְּחִיָּה','דְּעִיכָה','הַקְפָּאָה','שִׁכְחָה'], a: 0 },
  { q: 'What does "prejudice" mean?', opts: ['דַּעַת קְדוּמָה','הֲבָנָה','כָּבוֹד','הֶגְיוֹן'], a: 0 },
]

const BANKS = [null, GRADE1, GRADE2, GRADE3, GRADE4, GRADE5, GRADE6]

export function getEnglishQuestions(grade, count = 5) {
  const bank = BANKS[Math.min(6, Math.max(1, grade))] || GRADE1
  return shuffle(bank).slice(0, count).map(({ q, opts, a }) => ({
    question: q,
    options: opts,
    correctIndex: a,
  }))
}
