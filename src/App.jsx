import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [status, setStatus] = useState('Готов к записи')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [script, setScript] = useState('latin')
  const [view, setView] = useState('voice')
  const [inputText, setInputText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [translationDirection, setTranslationDirection] = useState('ru-uz')
  const [translationScript, setTranslationScript] = useState('latin')
  const [isTranslating, setIsTranslating] = useState(false)
  const [dictionary, setDictionary] = useState(new Set())
  const [russianDictionary, setRussianDictionary] = useState(new Set())
  const recognitionRef = useRef(null)
  const recognitionActiveRef = useRef(false)
  const recognitionSessionRef = useRef(0)
  const recognitionRestartTimerRef = useRef(null)
  const recognitionTransitionRef = useRef(false)
  const pendingStartRef = useRef(false)
  const interimSpeechRef = useRef('')

  const normalizeUzbek = (text) => {
    const dictionary = { "o'zbek": 'oʻzbek', "g'ayrat": 'gʻayrat', "g'isht": 'gʻisht', "o'g'il": 'oʻgʻil', "to'g'ri": 'toʻgʻri', "bo'ladi": 'boʻladi', "so'rov": 'soʻrov', "ko'rsatma": 'koʻrsatma' }
    return text.replace(/\S+/g, (word) => {
      const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? ''
      const trailing = word.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? ''
      const cleanWord = word.slice(leading.length, word.length - trailing.length)
      const normalized = dictionary[cleanWord.toLowerCase()]
      return normalized ? `${leading}${normalized}${trailing}` : word
    })
  }

  const cleanSpeechText = (text) => text
    .replace(/(?<![\p{L}\p{N}])\d{5,}(?![\p{L}\p{N}])/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  const appendSpeechText = (text) => {
    const cleanText = cleanSpeechText(text)
    if (!cleanText) return
    setTranscript((previous) => {
      const current = cleanSpeechText(previous)
      const currentWords = current.split(/\s+/)
      const nextWords = cleanText.split(/\s+/)
      const overlapLimit = Math.min(8, currentWords.length, nextWords.length)
      let overlap = 0
      for (let size = overlapLimit; size > 0; size -= 1) {
        if (currentWords.slice(-size).join(' ').toLowerCase() === nextWords.slice(0, size).join(' ').toLowerCase()) {
          overlap = size
          break
        }
      }
      const merged = [...currentWords, ...nextWords.slice(overlap)].join(' ').trim()
      return normalizeUzbek(merged)
    })
  }

  const latinToCyrillic = (text) => {
    const converted = text
      .replace(/Oʻ|O‘|O’|O'/g, 'Ў').replace(/oʻ|o‘|o’|o'/g, 'ў')
      .replace(/Gʻ|G‘|G’|G'/g, 'Ғ').replace(/gʻ|g‘|g’|g'/g, 'ғ')
      .replace(/Sh/g, 'Ш').replace(/sh/g, 'ш').replace(/Ch/g, 'Ч').replace(/ch/g, 'ч')
      .replace(/Ya/g, 'Я').replace(/ya/g, 'я').replace(/Yo/g, 'Ё').replace(/yo/g, 'ё')
      .replace(/Yu/g, 'Ю').replace(/yu/g, 'ю').replace(/Ye/g, 'Е').replace(/ye/g, 'е')
      .replace(/Ng/g, 'Нг').replace(/ng/g, 'нг')
      .replace(/O/g, 'О').replace(/o/g, 'о').replace(/G/g, 'Г').replace(/g/g, 'г')
      .replace(/Q/g, 'Қ').replace(/q/g, 'қ').replace(/H/g, 'Ҳ').replace(/h/g, 'ҳ')
      .replace(/A/g, 'А').replace(/a/g, 'а').replace(/B/g, 'Б').replace(/b/g, 'б')
      .replace(/D/g, 'Д').replace(/d/g, 'д').replace(/E/g, 'Е').replace(/e/g, 'е')
      .replace(/F/g, 'Ф').replace(/f/g, 'ф').replace(/I/g, 'И').replace(/i/g, 'и')
      .replace(/J/g, 'Ж').replace(/j/g, 'ж').replace(/K/g, 'К').replace(/k/g, 'к')
      .replace(/L/g, 'Л').replace(/l/g, 'л').replace(/M/g, 'М').replace(/m/g, 'м')
      .replace(/N/g, 'Н').replace(/n/g, 'н').replace(/P/g, 'П').replace(/p/g, 'п')
      .replace(/R/g, 'Р').replace(/r/g, 'р').replace(/S/g, 'С').replace(/s/g, 'с')
      .replace(/T/g, 'Т').replace(/t/g, 'т').replace(/U/g, 'У').replace(/u/g, 'у')
      .replace(/V/g, 'В').replace(/v/g, 'в').replace(/X/g, 'Х').replace(/x/g, 'х')
      .replace(/Y/g, 'Й').replace(/y/g, 'й').replace(/Z/g, 'З').replace(/z/g, 'з')
      .replace(/C/g, 'Ц').replace(/c/g, 'ц')

    return converted.replace(/\S+/g, (word) => {
      const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? ''
      const trailing = word.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? ''
      const cleanWord = word.slice(leading.length, word.length - trailing.length)
      return dictionary.has(cleanWord.toLowerCase()) ? `${leading}${cleanWord}${trailing}` : word
    })
  }

  const cyrillicToLatin = (text) => text
    .replace(/Ў/g, 'Oʻ').replace(/ў/g, 'oʻ').replace(/Ғ/g, 'Gʻ').replace(/ғ/g, 'gʻ')
    .replace(/Ш/g, 'Sh').replace(/ш/g, 'sh').replace(/Ч/g, 'Ch').replace(/ч/g, 'ch')
    .replace(/Я/g, 'Ya').replace(/я/g, 'ya').replace(/Ё/g, 'Yo').replace(/ё/g, 'yo')
    .replace(/Ю/g, 'Yu').replace(/ю/g, 'yu').replace(/Е/g, 'E').replace(/е/g, 'e')
    .replace(/Қ/g, 'Q').replace(/қ/g, 'q').replace(/Ҳ/g, 'H').replace(/ҳ/g, 'h')
    .replace(/А/g, 'A').replace(/а/g, 'a').replace(/Б/g, 'B').replace(/б/g, 'b')
    .replace(/Д/g, 'D').replace(/д/g, 'd').replace(/Э/g, 'E').replace(/э/g, 'e')
    .replace(/Ф/g, 'F').replace(/ф/g, 'f').replace(/И/g, 'I').replace(/и/g, 'i')
    .replace(/Ж/g, 'J').replace(/ж/g, 'j').replace(/К/g, 'K').replace(/к/g, 'k')
    .replace(/Л/g, 'L').replace(/л/g, 'l').replace(/М/g, 'M').replace(/м/g, 'm')
    .replace(/Нг/g, 'Ng').replace(/нг/g, 'ng').replace(/Н/g, 'N').replace(/н/g, 'n')
    .replace(/П/g, 'P').replace(/п/g, 'p').replace(/Р/g, 'R').replace(/р/g, 'r')
    .replace(/С/g, 'S').replace(/с/g, 's').replace(/Т/g, 'T').replace(/т/g, 't')
    .replace(/У/g, 'U').replace(/у/g, 'u').replace(/В/g, 'V').replace(/в/g, 'v')
    .replace(/Х/g, 'X').replace(/х/g, 'x').replace(/Й/g, 'Y').replace(/й/g, 'y')
    .replace(/З/g, 'Z').replace(/з/g, 'z').replace(/Ц/g, 'C').replace(/ц/g, 'c')
    .replace(/О/g, 'O').replace(/о/g, 'o').replace(/Г/g, 'G').replace(/г/g, 'g')

  const convertUzbekScript = (text, targetScript) => {
    if (targetScript === 'cyrillic') return latinToCyrillic(cyrillicToLatin(text))
    return cyrillicToLatin(text)
  }

  const decodeHtmlEntities = (text) => text.replace(/&(?:#39|#x27|39);?/gi, "'")
    .replace(/&quot;?/gi, '"')
    .replace(/&amp;?/gi, '&')
    .replace(/&lt;?/gi, '<')
    .replace(/&gt;?/gi, '>')

  const formatTranslation = (text) => decodeHtmlEntities(text).split('').filter((character) => {
    const code = character.charCodeAt(0)
    return code === 9 || code === 10 || code === 13 || code >= 32
  }).join('')
    .replace(/[#^*]+/g, '')
    .replace(/[�]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=[\p{L}\p{N}])/gu, '$1 ')
    .replace(/([.!?])\s*([\p{L}])/gu, (_, punctuation, letter) => `${punctuation} ${letter.toUpperCase()}`)
    .trim()

  const translateOutput = (text) => formatTranslation(text)

  const correctUzbekTranslation = (text) => {
    const corrections = { ' и ': ' va ', ' но ': ' lekin ', ' или ': ' yoki ', ' не ': ' emas ', ' это ': ' bu ', ' текст ': ' matn ', ' язык ': ' til ', ' спасибо': ' rahmat' }
    let result = ` ${text} `.replace(/\s+/g, ' ')
    Object.entries(corrections).forEach(([source, target]) => { result = result.replaceAll(source, target) })
    return result.trim()
  }

  const splitForMyMemory = (text, maxLength = 450) => {
    const chunks = []
    let current = ''
    text.trim().split(/\s+/).forEach((word) => {
      if (word.length > maxLength) {
        if (current) chunks.push(current)
        for (let index = 0; index < word.length; index += maxLength) chunks.push(word.slice(index, index + maxLength))
        current = ''
        return
      }
      const candidate = current ? `${current} ${word}` : word
      if (candidate.length > maxLength) {
        chunks.push(current)
        current = word
      } else {
        current = candidate
      }
    })
    if (current) chunks.push(current)
    return chunks
  }

  const translateWithMyMemory = async (text, languagePair) => {
    const chunks = splitForMyMemory(text)
    const translations = []
    for (const chunk of chunks) {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${languagePair}`)
      if (!response.ok) throw new Error('translation request failed')
      const data = await response.json()
      if (!data.responseData?.translatedText) throw new Error('empty translation')
      translations.push(data.responseData.translatedText)
    }
    return translations.join(' ')
  }

  const displayText = script === 'cyrillic' ? latinToCyrillic(transcript) : transcript
  const displayInterim = script === 'cyrillic' ? latinToCyrillic(interimTranscript) : interimTranscript

  const startTranscriptEditing = () => {
    setTranscriptDraft(displayText)
    setIsEditingTranscript(true)
  }

  const saveTranscriptEdit = () => {
    const normalizedDraft = cleanSpeechText(transcriptDraft)
    setTranscript(normalizeUzbek(script === 'cyrillic' ? cyrillicToLatin(normalizedDraft) : normalizedDraft))
    setIsEditingTranscript(false)
  }

  const cancelTranscriptEdit = () => setIsEditingTranscript(false)

  const translateRussianLocally = (text) => {
    const phrases = {
      'перевести текст на узбекский язык': 'oʻzbek tiliga matnni tarjima qilmoq',
      'доброе утро': 'xayrli tong',
      'добрый день': 'xayrli kun',
      'добрый вечер': 'xayrli kech',
      'как дела': 'ishlaringiz qalay',
      'большое спасибо': 'katta rahmat',
      'до свидания': 'xayr',
      'я понимаю': 'men tushunaman',
      'меня зовут': 'mening ismim',
      'пожалуйста': 'iltimos',
      'спасибо': 'rahmat',
    }
    const words = {
      'я': 'men', 'ты': 'sen', 'вы': 'siz', 'мы': 'biz', 'они': 'ular', 'это': 'bu', 'есть': 'bor',
      'и': 'va', 'но': 'lekin', 'или': 'yoki', 'не': 'emas', 'да': 'ha', 'нет': 'yoʻq', 'мой': 'mening',
      'твой': 'sening', 'наш': 'bizning', 'дом': 'uy', 'город': 'shahar', 'страна': 'mamlakat',
      'узбекистан': 'Oʻzbekiston', 'русский': 'rus', 'узбекский': 'oʻzbek', 'язык': 'til', 'текст': 'matn',
      'речь': 'nutq', 'время': 'vaqt', 'сегодня': 'bugun', 'завтра': 'ertaga', 'вчера': 'kecha',
      'хорошо': 'yaxshi', 'плохо': 'yomon', 'новый': 'yangi', 'большой': 'katta', 'маленький': 'kichik',
      'говорить': 'gapirmoq', 'перевести': 'tarjima qilmoq', 'перевод': 'tarjima', 'работает': 'ishlaydi',
      'нужно': 'kerak', 'можно': 'mumkin', 'хочу': 'xohlayman', 'получить': 'olmoq', 'запись': 'yozuv', 'на': 'ga',
    }
    let result = text.toLowerCase()
    Object.entries(phrases).forEach(([source, target]) => { result = result.replaceAll(source, target) })
    return result.replace(/\S+/g, (word) => {
      const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? ''
      const trailing = word.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? ''
      const cleanWord = word.slice(leading.length, word.length - trailing.length)
      return `${leading}${words[cleanWord] ?? cleanWord}${trailing}`
    })
  }

  const translateUzbekLocally = (text) => {
    const phrases = {
      'xayrli tong': 'доброе утро',
      'xayrli kun': 'добрый день',
      'xayrli kech': 'добрый вечер',
      'ishlaringiz qalay': 'как ваши дела',
      'katta rahmat': 'большое спасибо',
      'men tushunaman': 'я понимаю',
      'mening ismim': 'меня зовут',
    }
    const words = {
      'men': 'я', 'sen': 'ты', 'siz': 'вы', 'biz': 'мы', 'ular': 'они', 'bu': 'это', 'bor': 'есть',
      'va': 'и', 'lekin': 'но', 'yoki': 'или', 'emas': 'не', 'ha': 'да', 'yoʻq': 'нет', 'yoq': 'нет',
      'mening': 'мой', 'sening': 'твой', 'bizning': 'наш', 'uy': 'дом', 'shahar': 'город',
      'mamlakat': 'страна', 'oʻzbekiston': 'узбекистан', 'ozbekiston': 'узбекистан', 'rus': 'русский',
      'oʻzbek': 'узбекский', 'ozbek': 'узбекский', 'til': 'язык', 'matn': 'текст', 'nutq': 'речь',
      'vaqt': 'время', 'bugun': 'сегодня', 'ertaga': 'завтра', 'kecha': 'вчера', 'yaxshi': 'хорошо',
      'yomon': 'плохо', 'yangi': 'новый', 'katta': 'большой', 'kichik': 'маленький', 'rahmat': 'спасибо',
      'iltimos': 'пожалуйста', 'ishlaydi': 'работает', 'kerak': 'нужно', 'mumkin': 'можно',
      'xohlayman': 'хочу', 'olmoq': 'получить', 'yozuv': 'запись', 'tarjima': 'перевод',
    }
    let result = cyrillicToLatin(text).toLowerCase()
    Object.entries(phrases).forEach(([source, target]) => { result = result.replaceAll(source, target) })
    return result.replace(/\S+/g, (word) => {
      const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? ''
      const trailing = word.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? ''
      const cleanWord = word.slice(leading.length, word.length - trailing.length)
      return `${leading}${words[cleanWord] ?? cleanWord}${trailing}`
    })
  }

  const translatedDisplay = translationDirection === 'ru-uz'
    ? formatTranslation(convertUzbekScript(translatedText, translationScript))
    : translateOutput(translatedText)

  const stopRecording = () => {
    if (recognitionTransitionRef.current) return
    recognitionTransitionRef.current = true
    recognitionActiveRef.current = false
    recognitionSessionRef.current += 1
    window.clearTimeout(recognitionRestartTimerRef.current)
    recognitionRestartTimerRef.current = null
    try { recognitionRef.current?.stop() } catch { /* браузер уже завершает распознавание */ }
    recognitionRef.current = null
    setIsRecording(false)
    appendSpeechText(interimSpeechRef.current)
    interimSpeechRef.current = ''
    setInterimTranscript('')
    setStatus('Распознавание завершено')
    window.setTimeout(() => {
      recognitionTransitionRef.current = false
      if (pendingStartRef.current) {
        pendingStartRef.current = false
        startRecording()
      }
    }, 120)
  }

  const startRecording = () => {
    if (recognitionTransitionRef.current) {
      pendingStartRef.current = true
      return
    }
    setError('')
    setCopied(false)
    setTranscript('')
    setInterimTranscript('')
    interimSpeechRef.current = ''
    setIsEditingTranscript(false)
    recognitionActiveRef.current = false
    recognitionSessionRef.current += 1
    window.clearTimeout(recognitionRestartTimerRef.current)
    recognitionRestartTimerRef.current = null
    try { recognitionRef.current?.stop() } catch { /* предыдущий экземпляр уже остановлен */ }
    recognitionRef.current = null
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Этот браузер не поддерживает распознавание речи.')
      return
    }
    try {
      const sessionId = recognitionSessionRef.current
      recognitionActiveRef.current = true
      setIsRecording(true)
      setStatus('Слушаю узбекскую речь')
      const startRecognitionInstance = () => {
        if (!recognitionActiveRef.current || recognitionSessionRef.current !== sessionId) return
        const recognition = new SpeechRecognition()
        let lastInstanceFinal = ''
        recognition.lang = 'uz-UZ'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 3
        recognition.onstart = () => {
          if (recognitionSessionRef.current === sessionId) setStatus('Слушаю узбекскую речь')
        }
        recognition.onresult = (event) => {
          if (recognitionSessionRef.current !== sessionId || recognitionRef.current !== recognition) return
          let finalText = ''
          let currentInterim = ''
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index]
            let bestAlternative = result[0]
            for (let alternativeIndex = 1; alternativeIndex < result.length; alternativeIndex += 1) {
              if ((result[alternativeIndex].confidence ?? 0) > (bestAlternative.confidence ?? 0)) {
                bestAlternative = result[alternativeIndex]
              }
            }
            if (result.isFinal) finalText += bestAlternative.transcript
            else currentInterim += bestAlternative.transcript
          }
          const cleanFinal = cleanSpeechText(finalText)
          if (cleanFinal && cleanFinal !== lastInstanceFinal) {
            lastInstanceFinal = cleanFinal
            appendSpeechText(cleanFinal)
          }
          const cleanInterim = cleanSpeechText(currentInterim)
          interimSpeechRef.current = cleanInterim
          setInterimTranscript(cleanInterim)
        }
        recognition.onerror = (event) => {
          if (recognitionSessionRef.current !== sessionId) return
          if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(event.error)) {
            recognitionActiveRef.current = false
            setIsRecording(false)
            setStatus('Готов к записи')
            setError(`Распознавание остановлено: ${event.error}`)
          } else if (event.error !== 'aborted' && event.error !== 'no-speech' && event.error !== 'network') {
            setError(`Не удалось распознать речь: ${event.error}`)
          }
        }
        recognition.onend = () => {
          appendSpeechText(interimSpeechRef.current)
          interimSpeechRef.current = ''
          setInterimTranscript('')
          if (recognitionActiveRef.current && recognitionSessionRef.current === sessionId) {
            recognitionRestartTimerRef.current = window.setTimeout(startRecognitionInstance, 150)
          }
        }
        recognitionRef.current = recognition
        try {
          recognition.start()
        } catch {
          recognitionRef.current = null
          if (recognitionActiveRef.current && recognitionSessionRef.current === sessionId) {
            recognitionRestartTimerRef.current = window.setTimeout(startRecognitionInstance, 250)
          }
        }
      }
      startRecognitionInstance()
    } catch {
      recognitionActiveRef.current = false
      recognitionRef.current = null
      setIsRecording(false)
      setError('Не удалось запустить распознавание. Разрешите доступ к микрофону в браузере.')
    }
  }

  const handleRecord = () => { if (isRecording) stopRecording(); else startRecording() }

  const copyTranscript = async () => {
    if (!transcript) return
    await navigator.clipboard.writeText(displayText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const copyTranslation = async () => {
    if (!translatedText) return
    await navigator.clipboard.writeText(translatedDisplay)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const translateText = async () => {
    if (!inputText.trim()) return
    setIsTranslating(true)
    setError('')
    try {
      const apiLanguagePair = translationDirection.replace('-', '|')
      const myMemoryTranslation = await translateWithMyMemory(inputText, apiLanguagePair)
      const cleanedTranslation = translationDirection === 'ru-uz' ? correctUzbekTranslation(myMemoryTranslation) : myMemoryTranslation
      setTranslatedText(translateOutput(cleanedTranslation))
    } catch {
      const localResult = translationDirection === 'ru-uz' ? translateRussianLocally(inputText) : translateUzbekLocally(inputText)
      setTranslatedText(translateOutput(localResult))
      setError('Онлайн-перевод временно недоступен. Использован локальный словарь.')
    } finally {
      setIsTranslating(false)
    }
  }

  useEffect(() => () => {
    recognitionActiveRef.current = false
    pendingStartRef.current = false
    recognitionSessionRef.current += 1
    window.clearTimeout(recognitionRestartTimerRef.current)
    try { recognitionRef.current?.stop() } catch { /* компонент уже размонтируется */ }
    recognitionRef.current = null
  }, [])

  useEffect(() => {
    fetch('/uzbek-wordlist.txt')
      .then((response) => response.text())
      .then((words) => setDictionary(new Set(words.split(/\r?\n/).map((word) => word.trim().toLowerCase()).filter(Boolean))))
      .catch(() => setError('Кириллический словарь не загрузился, но транскрибация доступна.'))
    fetch('/russian-wordlist.dic')
      .then((response) => response.text())
      .then((words) => setRussianDictionary(new Set(words.split(/\r?\n/).slice(1).map((word) => word.split('/')[0].trim().toLowerCase()).filter(Boolean))))
      .catch(() => setError('Русский словарь не загрузился, но перевод доступен.'))
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">uz</div>
        <div><span className="eyebrow">Ovozli kundalik</span><strong>Ovoz → matn</strong></div>
        <span className="language-pill">UZ · UZBEK</span>
      </header>
      <nav className="mode-tabs" aria-label="Режим приложения">
        <button className={view === 'voice' ? 'active' : ''} type="button" onClick={() => setView('voice')}><span>●</span> Голос → текст</button>
        <button className={view === 'translate' ? 'active' : ''} type="button" onClick={() => setView('translate')}><span>文</span> Переводчик</button>
      </nav>
      <section className="workspace">
        <div className="intro"><p className="kicker">Tovushni ma'noga aylantiring</p><h1>Узбекская речь,<br /><em>точно записанная.</em></h1><p className="description">Говорите естественно. Браузер распознает речь на узбекском языке и подготовит чистый текст.</p></div>
        {view === 'voice' && <div className={`record-zone ${isRecording ? 'is-recording' : ''}`}>
          <div className="signal-ring ring-one" /><div className="signal-ring ring-two" />
          <button className="record-button" type="button" onClick={handleRecord} aria-label={isRecording ? 'Остановить запись' : 'Записать узбекскую речь'}><span className="record-icon">{isRecording ? '■' : '●'}</span><span>{isRecording ? 'Остановить' : 'Записать узбекскую речь'}</span></button>
          <div className="record-status"><span className={`status-dot ${isRecording ? 'live' : ''}`} />{status}</div>
        </div>}
        {view === 'translate' && <section className="translator-panel">
          <div className="translator-head"><div><span className="section-label">{translationDirection === 'ru-uz' ? 'Русский → узбекский' : 'Узбекский → русский'}</span><h2>Переводчик</h2></div><span className="ai-badge"><span>✦</span> MyMemory + словарь</span></div>
          <div className="direction-switcher" role="group" aria-label="Направление перевода"><button className={translationDirection === 'ru-uz' ? 'selected' : ''} type="button" onClick={() => { setTranslationDirection('ru-uz'); setTranslatedText('') }}>Русский → узбекский</button><button className={translationDirection === 'uz-ru' ? 'selected' : ''} type="button" onClick={() => { setTranslationDirection('uz-ru'); setTranslatedText('') }}>Узбекский → русский</button></div>
          <textarea value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder={translationDirection === 'ru-uz' ? 'Вставьте текст на русском языке...' : 'Вставьте текст на узбекском языке...'} aria-label={translationDirection === 'ru-uz' ? 'Русский текст' : 'Узбекский текст'} />
          <div className="translator-tools">{translationDirection === 'ru-uz' && <><span>Письменность:</span><button className={translationScript === 'latin' ? 'selected' : ''} type="button" onClick={() => setTranslationScript('latin')}>Lotin</button><button className={translationScript === 'cyrillic' ? 'selected' : ''} type="button" onClick={() => setTranslationScript('cyrillic')}>Кирилл</button></>}<button className="translate-button" type="button" onClick={translateText} disabled={!inputText.trim() || isTranslating}>{isTranslating ? 'Перевожу...' : 'Перевести'}</button></div>
          <div className={`translation-result ${translatedText ? '' : 'empty'}`}>{translatedText ? translatedDisplay : 'Здесь появится перевод на узбекский язык...'}</div>
          <div className="card-actions"><button className="copy-button" type="button" onClick={copyTranslation} disabled={!translatedText}><span aria-hidden="true">▣</span>{copied ? 'Скопировано' : 'Скопировать перевод'}</button><span className="dictionary-note">{translationDirection === 'ru-uz' ? `${russianDictionary.size.toLocaleString('ru-RU')} русских слов` : `${dictionary.size.toLocaleString('ru-RU')} узбекских слов`} загружено</span></div>
        </section>}
        {error && <div className="notice" role="alert">{error}</div>}
        {view === 'voice' && <section className="transcript-card" aria-live="polite">
          <div className="card-heading"><div><span className="section-label">Результат</span><h2>Ваш текст</h2></div><span className="ai-badge"><span>✦</span> AI-словарь</span></div>
          <div className="script-switcher" role="group" aria-label="Письменность результата"><span>Письменность</span><button className={script === 'latin' ? 'selected' : ''} type="button" onClick={() => setScript('latin')}>Lotin</button><button className={script === 'cyrillic' ? 'selected' : ''} type="button" onClick={() => setScript('cyrillic')}>Кирилл</button></div>
          {isEditingTranscript ? <textarea className="transcript-editor" value={transcriptDraft} onChange={(event) => setTranscriptDraft(event.target.value)} aria-label="Редактирование расшифровки" /> : <div className={`transcript-body ${transcript || interimTranscript ? '' : 'empty'}`}>{transcript || interimTranscript ? <>{displayText}<span className="interim">{displayInterim}</span></> : <span>Здесь появится расшифровка вашей речи...</span>}</div>}
          <div className="card-actions"><button className="copy-button" type="button" onClick={isEditingTranscript ? saveTranscriptEdit : startTranscriptEditing} disabled={!transcript && !isEditingTranscript}><span aria-hidden="true">{isEditingTranscript ? '✓' : '✎'}</span>{isEditingTranscript ? 'Сохранить исправления' : 'Исправить текст'}</button>{isEditingTranscript && <button className="cancel-button" type="button" onClick={cancelTranscriptEdit}>Отмена</button>}<button className="copy-button" type="button" onClick={copyTranscript} disabled={!transcript || isEditingTranscript}><span aria-hidden="true">▣</span>{copied ? 'Скопировано' : 'Скопировать текст'}</button></div>
        </section>}
      </section>
      <footer><span>Распознавание в браузере</span><span className="footer-line" /><span>Язык: uz-UZ</span></footer>
    </main>
  )
}

export default App
