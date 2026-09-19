import { EXERCISES, PROGRAMS, GLOSSARY, PHRASES } from './data.mjs';
import { EXERCISE_TRANSLATIONS, PROGRAM_TRANSLATIONS, GLOSSARY_TRANSLATIONS } from './data.en.mjs';

// Both languages live together so adding a label cannot silently omit a locale.
export const MESSAGES = {
  title: ['GYM — HillmanChan 訓練手記', 'GYM — HillmanChan Training Journal'],
  description: ['HillmanChan Gym：廣東話／英文動作指南、離線訓練日曆，同你每一下嘅紀錄。', 'HillmanChan Gym: exercise demos, an offline workout calendar and your personal training journal.'],
  skip: ['跳去內容', 'Skip to content'], home: ['HillmanChan Gym 主頁', 'HillmanChan Gym home'],
  brand: ['GYM / 訓練手記', 'GYM / TRAINING JOURNAL'], navigation: ['主要導覽', 'Main navigation'],
  navToday: ['今日訓練', 'Train'], navCalendar: ['訓練日曆', 'Journal'], navLibrary: ['動作指南', 'Exercises'], navGuide: ['Gym 用語', 'Gym guide'],
  settings: ['設定', 'Settings'], settingsLabel: ['備份與設定', 'Backup and settings'], language: ['語言 / Language', 'Language'],
  footer: ['每一下，都算數。', 'Every rep counts.'],
  pauseDemos: ['Ⅱ 暫停示範', 'Ⅱ Pause demos'], playDemos: ['▶ 播放示範', '▶ Play demos'],
  savingError: ['未能儲存：{error}。請先匯出備份，檢查瀏覽器儲存空間或設定。', 'Could not save: {error} Export a backup and check your browser storage settings or available space.'],
  saved: ['已儲存喺呢部裝置', 'Saved on this device'], noPrevious: ['記低今次，留畀下次嘅自己。', 'Log this set as a reference for next time.'],
  previous: ['上次 {date} · {value}', 'Last time, {date} · {value}'],
  seconds: ['秒', 'sec'], minutes: ['分鐘', 'min'], reps: ['下', 'reps'], sets: ['組', 'sets'], restTime: ['休息 {seconds} 秒', 'Rest {seconds} sec'],
  calendarLabel: ['訓練月曆', 'Workout calendar'], prevMonth: ['上一個月', 'Previous month'], nextMonth: ['下一個月', 'Next month'],
  done: ['已完成', 'Done'], recorded: ['有紀錄', 'Logged'], rest: ['休息', 'Rest'], planned: ['計劃訓練', 'Planned'], restDay: ['休息日', 'Rest day'],
  monthDoneBefore: ['今個月完成 ', 'Days completed this month: '], days: ['日', 'days'], backToday: ['返去今日 ↗', 'Today ↗'],
  notesTitle: ['今日手記', 'Daily notes'], bodyweight: ['體重 · Body weight (kg)', 'Body weight (kg)'], bodyweightExample: ['例如 72.5', 'e.g. 72.5'],
  feeling: ['今日感覺點？', 'How did today feel?'], notesPlaceholder: ['今日嘅狀態、重量、教練提你嘅重點…', 'Energy, weights, coaching cues, or anything to remember…'],
  dayStatus: ['當日狀態', 'Day status'], autosave: ['一邊記，一邊自動儲存。只限呢個瀏覽器。', 'Saves as you type, in this browser only.'],
  pending: ['示範整理中', 'Demo being prepared'], watchExercise: ['睇{name}示範', 'Watch {name} demo'],
  demoLink: ['動作示範 ↗', 'Watch demo ↗'], setHeading: ['組', 'Set'], weightHeading: ['重量 KG', 'Weight kg'], timeSec: ['時間 SEC', 'Time sec'], timeMin: ['時間 MIN', 'Time min'], repsHeading: ['次數 REPS', 'Reps'],
  setWeight: ['{name}第{set}組重量', '{name}, set {set}, weight in kg'], setReps: ['{name}第{set}組次數或時間（{unit}）', '{name}, set {set}, {unit}'], setDone: ['{name}第{set}組完成', '{name}, set {set}, completed'],
  addSet: ['＋ 加一組', '＋ Add set'], todayTraining: ['今日訓練', 'Today’s workout'], dayTraining: ['當日訓練', 'Workout'], prevDay: ['前一日', 'Previous day'], nextDay: ['後一日', 'Next day'], trainingDate: ['訓練日期', 'Workout date'],
  restTitle: ['休息，都係訓練一部分。', 'Recovery is part of training.'], restSubtitle: ['回一回氣，等下一次做得更好。', 'Recharge for your next session.'], sessionSubtitle: ['{count} 個動作 · 專注姿勢，逐步進步', '{count} exercises · Focus on form and steady progress'],
  programme: ['課表 · Programme', 'Programme'], session: ['訓練內容 · Session', 'Session'], takeEasy: ['今日可以輕鬆啲。', 'Take it easy today.'],
  restHelp: ['行下路、活動下關節，或者記低身體狀態。想改期訓練，揀好課表就可以開始。', 'Go for a walk, move gently, or note how you feel. To train today, choose a programme and start a session.'], startTraining: ['今日照樣練 →', 'Train today →'],
  warmup: ['先做 5–10 分鐘輕量熱身，再用較輕重量練習第一個動作。正式組保留約 2–3 下餘力；有尖銳痛就停。', 'Warm up gently for 5–10 minutes, then practise the first exercise with a lighter weight. Keep about 2–3 reps in reserve during working sets. Stop if you feel sharp pain.'],
  undoFinish: ['✓ 呢日已完成 · 取消完成', '✓ Completed · Undo'], finish: ['完成今日訓練　✓', 'Finish workout ✓'], completedBefore: ['已完成 ', 'Sets completed: '],
  heroFirst: ['練好每一下。', 'Make every rep count.'], heroSecond: ['記低每一步。', 'Track every step.'],
  heroIntro: ['由第一下開始，練出自己嘅節奏。', 'Find your rhythm, one session at a time.'], heroDetails: ['廣東話／英文指引・動作示範・離線都用得。', 'Exercise demos, personal notes, and offline access.'],
  trainingTip: ['重量係紀錄，姿勢先係重點。做到目標次數、每組都穩定，下次先考慮加少少重量。', 'Track the weight, focus on your form. Once you reach your target reps with control in every set, consider a small increase next time.'], askTrainer: ['唔識用器材？試下咁問教練 ↗', 'Need help with equipment? Ask a trainer ↗'],
  calendarTitle: ['每一日，都有紀錄。', 'Your progress, day by day.'], calendarIntro: ['撳一日，睇返重量、完成嘅組數，同嗰日嘅自己講過嘅嘢。', 'Choose a day to review your weights, completed sets and notes.'],
  localNote: ['紀錄只會留喺呢個瀏覽器。換電話、清除網站資料之前，記得喺「設定」匯出備份。', 'Records stay in this browser. Export a backup in Settings before changing phones or clearing website data.'],
  libraryTitle: ['先學識，再加重。', 'Learn the movement. Build the strength.'], libraryIntro: ['睇示範、記住發力重點，再將每一下做好。', 'Watch the demo, learn the key cues, and make each rep controlled.'],
  searchLabel: ['搜尋動作', 'Search exercises'], searchPlaceholder: ['搵動作：深蹲、Bench Press、啞鈴…', 'Search: squat, bench press, dumbbell…'], filterLabel: ['篩選器材', 'Filter by equipment'],
  all: ['全部', 'All'], dumbbell: ['啞鈴', 'Dumbbell'], barbell: ['槓鈴', 'Barbell'], machine: ['機械', 'Machine'], bodyweightFilter: ['徒手', 'Bodyweight'],
  noResults: ['未搵到呢個動作。', 'No exercises found.'], searchHelp: ['試下英文名，或者揀「全部」。', 'Try another exercise name or select All.'], watch: ['▶ 睇示範', '▶ Watch demo'], movementGuide: ['動作指引 ↗', 'Exercise guide ↗'],
  guideTitle: ['識做，亦識講。', 'Feel at home in the gym.'], guideIntro: ['唔知點開口？直接畀教練睇呢一頁。', 'Not sure how to ask? Show these phrases to a trainer.'], usefulEnglish: ['喺 Gym，用得着嘅英文。', 'Useful things to ask.'], glossary: ['器材同訓練用語', 'Equipment and training terms'], yourRoutine: ['你而家嘅節奏', 'Your current routine'], training: ['訓練', 'Train'],
  guideTip1: ['打底期每星期 2–3 日，兩次全身訓練之間留休息日。唔使急住轉課表。', 'Start with 2–3 sessions a week, leaving a rest day between full-body workouts. There is no need to rush into a different programme.'],
  guideTip2: ['每組用控制到嘅重量，記低 kg 同實際次數。啞鈴重量記單邊；槓鈴重量包括槓。', 'Use a weight you can control and log the kg and actual reps. Record dumbbell weight per hand and barbell weight including the bar.'],
  guideTip3: ['示範係參考；初次使用器材，請教練調座椅、安全架同睇姿勢。', 'Use demos as a reference. When trying equipment for the first time, ask a trainer to adjust the seat and safety stops and check your form.'],
  guideTip4: ['保持正常呼吸；關節痛、頭暈或者胸痛就停止運動。', 'Keep breathing normally. Stop exercising if you feel joint pain, dizziness or chest pain.'],
  reference: ['參考：', 'Reference: '], nhs: ['NHS 成人活動指引 ↗', 'NHS physical activity guidelines for adults ↗'], sourceHelp: ['。每個動作嘅來源及媒體授權，見動作示範頁。', '. Exercise sources and media licences are listed in each demo.'],
  validDate: ['請揀有效日期。', 'Choose a valid date.'], closeDemo: ['關閉示範', 'Close demo'], demoDescription: ['{name}動作示範', '{name} exercise demonstration'],
  watchPath: ['睇清楚動作路線，再試做。', 'Watch the movement carefully before trying it.'], stillReference: ['靜態姿勢參考', 'Still posture reference'], playMovement: ['▶ 播放動作', '▶ Play movement'], pauseMovement: ['Ⅱ 暫停動作', 'Ⅱ Pause movement'],
  howTo: ['點樣做 / HOW TO', 'How to do it'], formCheck: ['留意呢幾點 / FORM CHECK', 'Form checks'], movementSource: ['動作參考：', 'Movement reference: '], originalGuide: ['原有訓練指南', 'Original training guide'], openGif: ['開啟 GIF 循環示範 ↗', 'Open looping GIF ↗'], credits: ['媒體來源與授權 ↗', 'Media sources and licences ↗'],
  settingsTitle: ['你嘅訓練手記', 'Your training journal'], closeSettings: ['關閉設定', 'Close settings'], defaultProgramme: ['預設課表', 'Default programme'], programmeHelp: ['只影響未記錄嘅日子；已儲存嘅訓練會保留原本安排。', 'Applies to days without a saved record. Existing workouts keep their original programme.'], startDate: ['開始日期', 'Start date'], saveProgramme: ['儲存課表設定', 'Save programme'],
  backupTitle: ['備份你嘅紀錄', 'Back up your records'], backupHelp: ['資料只儲喺呢部裝置、呢個瀏覽器。清除網站資料會刪除紀錄。匯出 JSON 備份可以喺另一部裝置匯入；已有日期會保留，唔會被覆蓋。', 'Records are stored on this device, in this browser. Clearing website data deletes them. Export a JSON backup to import on another device. Existing dates are preserved and will not be overwritten.'], export: ['↓ 匯出備份', '↓ Export backup'], import: ['↑ 匯入備份', '↑ Import backup'],
  offlineTitle: ['帶住入 Gym，冇網都用到。', 'Take it to the gym, even offline.'], offlineDetail: ['✓ 動作示範同介面已下載，可以離線使用。', '✓ The app and exercise demos are downloaded and ready to use offline.'], offlineFirst: ['第一次請保持連線，等頁頂顯示「已可離線用」。', 'On your first visit, stay online until the header says “Ready offline”.'], installHelp: ['iPhone：Safari → 分享 → 加入主畫面。Android / Chrome：選單 → 安裝應用程式。網站資料被清除後，需要重新下載。', 'iPhone: Safari → Share → Add to Home Screen. Android / Chrome: menu → Install app. Download the offline content again if website data is cleared.'],
  install: ['安裝到主畫面', 'Install on home screen'], retryOffline: ['重新檢查離線內容', 'Check offline content'], retainStorage: ['保留裝置儲存空間', 'Keep device storage'],
  invalidNumber: ['請輸入 0 至 {max} 之間嘅數字；呢個數值未儲存。', 'Enter a number between 0 and {max}. This value has not been saved.'], programmeSaved: ['課表已儲存；已有紀錄保持不變。', 'Programme saved. Existing records are unchanged.'], backupExported: ['備份已匯出，記得保留檔案。', 'Backup exported. Keep the file somewhere safe.'], offlineChecked: ['已重新檢查離線內容。', 'Offline content checked.'], storageGranted: ['瀏覽器已允許保留網站儲存空間。', 'The browser has allowed persistent website storage.'], storageNotGranted: ['瀏覽器未允許永久保留；請定期匯出備份。', 'The browser has not allowed persistent storage. Export backups regularly.'], failedAction: ['未能完成：{error}', 'Could not complete: {error}'], backupTooLarge: ['備份檔案超過 30 MB', 'The backup file is larger than 30 MB.'], imported: ['已匯入 {imported} 日；保留 {skipped} 日現有紀錄。', 'Imported {imported} days; preserved {skipped} existing days.'], importFailed: ['匯入唔到，現有紀錄冇改動：{error}', 'Import failed. Existing records are unchanged: {error}'],
  offlinePreparing: ['準備離線內容…', 'Preparing offline content…'], offlineUnsupported: ['呢個瀏覽器未支援離線使用', 'This browser does not support offline use'], offlineError: ['離線下載未完成，請連線後喺設定重試', 'Offline download incomplete. Reconnect and retry in Settings.'], offlineReady: ['已可離線用', 'Ready offline'], offlineMode: ['離線模式 · 已下載', 'Offline · Downloaded'], offlineDownloading: ['下載離線內容 {done}/{total}', 'Downloading offline content {done}/{total}'], offlineIncomplete: ['未完成離線下載', 'Offline download incomplete'], otherTab: ['另一個分頁更新咗紀錄。重新整理後再編輯，避免覆蓋。', 'Another tab updated your records. Refresh before editing to avoid overwriting changes.'], languageNotSaved: ['語言已切換，但瀏覽器未能記住設定。', 'Language changed, but the browser could not save your preference.'],
};

export function createTranslator(locale) {
  const index = locale === 'en-GB' ? 1 : 0;
  return (key, values = {}) => {
    if (!MESSAGES[key]) throw new Error(`Missing translation: ${key}`);
    return MESSAGES[key][index].replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
  };
}

export function localizeContent(locale) {
  const english = locale === 'en-GB';
  return {
    exercises: EXERCISES.map(exercise => {
      if (!english) return { ...exercise, name: exercise.zh };
      const text = EXERCISE_TRANSLATIONS[exercise.id];
      return { ...exercise, ...text, source: { ...exercise.source, label: text.sourceLabel }, mediaSource: { ...exercise.mediaSource, label: text.mediaSourceLabel } };
    }),
    programs: PROGRAMS.map(program => {
      if (!english) return { ...program, name: program.zh };
      const text = PROGRAM_TRANSLATIONS[program.id];
      return { ...program, ...text, days: program.days.map((day, index) => ({ ...day, label: text.days[index] })) };
    }),
    glossary: GLOSSARY.map(item => ({ ...item, name: english ? item.en : item.zh, meaning: english ? GLOSSARY_TRANSLATIONS[item.en] : item.meaning })),
    phrases: PHRASES,
  };
}

export function weekdayLabels(locale) {
  return Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + index, 12)));
}
