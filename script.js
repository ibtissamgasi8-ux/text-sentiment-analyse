'use strict';
/* =====================================================================
   Project 03 – Customer Support Chatbot (Arabic · Moroccan Darija · French)
   Educational, rule-based simulation. No AI model, no API, no backend.
   Sections: 1 Text utils · 2 Language detection · 3 Intent keywords ·
            4 Reply templates · 5 Engine · 6 User interface
   ===================================================================== */

/* ---------- 1. TEXT UTILITIES ---------- */

/** Lowercases, removes accents/Arabic diacritics and unifies Arabic letter variants. */
function norm(s) {
  return s.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[’‘]/g, "'")
    .normalize('NFC');
}
/** Normalized word tokens (apostrophes split words). */
function tokenize(text) { return norm(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean); }

/* ---------- 2. LANGUAGE DETECTION ---------- */

const DARIJA_AR = new Set('بغيت بغينا فين واش كيفاش شنو علاش دابا بزاف ديال ديالي ديالك ديالكم هاد هادي هادشي كاين غادي نعرف نرجع عافاك شحال وقتاش تمن زوين مزيان خايب كيخدمش'.split(' ').map(norm));
const DARIJA_LAT = new Set('bghit bghina wach dyal diyal machi kifach chno chnou daba bzaf ghadi kayn wsel wasel khayb mzyan 3afak afak ma3jbnich ch7al chhal taman rje3 khdam makhdam 3andi 3ndi'.split(' '));
const FRENCH = new Set('je tu il elle nous vous ils elles voudrais veux suis est sont pas ne mon ma mes le la les un une des du de que qui comment quels quelle quel bonjour bonsoir merci avez votre vos pour avec commande produit remboursement retourner'.split(' '));

/** Returns {key:'ar'|'darija'|'fr', label, assumed}. Reply language follows key. */
function detectLanguage(text, tokens) {
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const lat = (text.match(/[A-Za-z\u00C0-\u017F]/g) || []).length;
  if (ar >= lat && ar > 1) {
    const darija = tokens.some(t => DARIJA_AR.has(t) || (t.length >= 5 && t.endsWith('ش')));   // "-ش" = Darija negation suffix
    return darija ? { key: 'darija', label: 'Moroccan Darija' } : { key: 'ar', label: 'Arabic' };
  }
  if (lat > 1) {
    const da = tokens.filter(t => DARIJA_LAT.has(t)).length, fr = tokens.filter(t => FRENCH.has(t)).length;
    if (da && da >= fr) return { key: 'darija', label: 'Moroccan Darija (Latin letters)' };
    if (fr) return { key: 'fr', label: 'French' };
  }
  return { key: 'fr', label: 'Unknown (replying in French)', assumed: true };
}

/* ---------- 3. INTENT KEYWORDS  [keyword, weight] ----------
   Arabic keywords match anywhere inside a word (handles prefixes like ال/و/ب).
   Latin keywords match the start of a word ("retour" also matches "retourner"). */

const KEYWORDS = {
  'Order Tracking': [['فين وصل', 3], ['وين وصل', 3], ['وصل الطلب', 3], ['تتبع', 3], ['طلبي', 2], ['طلبيه', 2], ['طلب', 1], ['شحن', 2], ['توصيل', 2], ['تسليم', 1.5], ['وصل', 1.5], ['تاخر', 1.5],
    ['commande', 1.5], ['colis', 2.5], ['livraison', 2.5], ['suivi', 2.5], ['suivre', 2.5], ['tracking', 3], ['ou en est', 3], ['expedi', 2], ['retard', 1.5], ['fin wsel', 3], ['fin wasel', 3], ['wach wsel', 2], ['talab', 1.5]],
  'Product Information': [['سعر', 2.5], ['ثمن', 2.5], ['تمن', 2.5], ['شحال', 2], ['متوفر', 2.5], ['متاح', 2], ['منتج', 1.5], ['منتوج', 1.5], ['مقاس', 2.5], ['لون', 2], ['ضمان', 2.5], ['مواصفات', 3], ['خصائص', 2.5],
    ['prix', 2.5], ['tarif', 2.5], ['disponib', 2.5], ['stock', 2.5], ['taille', 2.5], ['couleur', 2], ['caracteristique', 3], ['garantie', 2.5], ['produit', 1], ['article', 1], ['modele', 1.5], ['dimension', 2], ['combien', 2], ['ch7al', 2.5], ['chhal', 2.5], ['taman', 2.5]],
  'Complaint': [['عجباتنيش', 3], ['عجبنيش', 3], ['شكايه', 3], ['شكوي', 3], ['سيء', 2.5], ['سيئ', 2.5], ['خايب', 2.5], ['غير مقبول', 3], ['مستاء', 3], ['زعفان', 2.5], ['غاضب', 2.5], ['مهزله', 3], ['كارثه', 3],
    ['plainte', 3], ['reclamation', 3], ['decu', 3], ['mecontent', 3], ['inacceptable', 3], ['inadmissible', 3], ['honte', 3], ['horrible', 2.5], ['mauvais', 2], ['nul', 2.5], ['insatisf', 3], ['scandaleux', 3], ['catastrophe', 3], ['colere', 2.5], ['pas satisfait', 3], ['khayb', 2.5], ['ma3jbnich', 3], ['chikaya', 3]],
  'Refund Request': [['استرجاع', 3], ['استرجع', 3], ['ارجاع', 3], ['استرداد', 3], ['تعويض', 2.5], ['رجاع', 3], ['نرجع', 3], ['ارجع', 2.5], ['فلوسي', 2.5], ['المبلغ', 1.5], ['الغاء', 2],
    ['rembours', 3.5], ['retour', 3.5], ['renvoyer', 2.5], ['echange', 2], ['annuler', 2.5], ['annulation', 2.5], ['argent', 1.5], ['refund', 3], ['rje3', 3], ['nrje3', 3], ['rdd', 2]],
  'Technical Support': [['كيخدمش', 3], ['خدامش', 3], ['يخدمش', 3], ['لا يعمل', 3], ['لا تعمل', 3], ['تطبيق', 2], ['موقع', 2], ['حساب', 1.5], ['كلمه السر', 3], ['كلمه المرور', 3], ['تسجيل الدخول', 3], ['تقني', 2], ['خطا', 2], ['يتوقف', 2], ['قدرتش ندخل', 3],
    ['connect', 2.5], ['connexion', 3], ['mot de passe', 3], ['mdp', 3], ['appli', 2.5], ['application', 2.5], ['site', 1.5], ['bug', 3], ['erreur', 2.5], ['plante', 2.5], ['marche pas', 3], ['fonctionne pas', 3], ['panne', 3], ['probleme technique', 3], ['compte', 1.5], ['paiement', 2], ['otp', 2], ['makhdam', 3], ['kaykhdem', 3], ['ma khdam', 3]]
};
// General Questions: greetings, thanks, opening hours / contact
const GENERAL = {
  greet: [['مرحبا', 2], ['سلام', 2], ['السلام', 2], ['اهلا', 2], ['صباح الخير', 2], ['مساء الخير', 2], ['bonjour', 2], ['bonsoir', 2], ['salut', 2], ['salam', 2], ['hello', 2]],
  thanks: [['شكرا', 2], ['بارك الله', 2], ['merci', 2], ['thanks', 2]],
  hours: [['ساعات العمل', 3], ['اوقات العمل', 3], ['مواعيد', 2], ['وقتاش', 2], ['عنوان', 2], ['هاتف', 2], ['تواصل', 2], ['اتصل', 2], ['horaire', 3], ['ouverture', 2.5], ['ouvert', 2], ['contact', 2.5], ['telephone', 2], ['adresse', 2], ['joindre', 2]]
};
const PRIORITY = ['Complaint', 'Refund Request', 'Technical Support', 'Order Tracking', 'Product Information', 'General Questions'];

/** Does normalized padded text contain this normalized keyword? */
function has(padded, kw) {
  return /^[a-z0-9' ]+$/.test(kw) ? padded.includes(' ' + kw) : padded.includes(kw);
}
function scoreList(padded, list) {
  let s = 0; const hit = [];
  list.forEach(([k, w]) => { const n = norm(k); if (has(padded, n)) { s += w; hit.push(k); } });
  return { s, hit };
}

/** Classifies the message. Returns {intent, matched, sub}. Falls back to General Questions. */
function classify(tokens) {
  const padded = ' ' + tokens.join(' ') + ' ';
  const res = {};
  Object.keys(KEYWORDS).forEach(i => { res[i] = scoreList(padded, KEYWORDS[i]); });
  const g = { greet: scoreList(padded, GENERAL.greet), thanks: scoreList(padded, GENERAL.thanks), hours: scoreList(padded, GENERAL.hours) };
  const gBest = Object.keys(g).sort((a, b) => g[b].s - g[a].s)[0];
  res['General Questions'] = g[gBest];
  const best = PRIORITY.filter(i => res[i].s > 0).sort((a, b) => res[b].s - res[a].s)[0];   // stable: ties follow PRIORITY
  if (!best) return { intent: 'General Questions', matched: [], sub: 'fallback' };
  return { intent: best, matched: res[best].hit, sub: best === 'General Questions' ? gBest : null };
}

/* ---------- 4. REPLY TEMPLATES (demo content for a fictional shop) ---------- */

const REPLIES = {
  ar: {
    'Order Tracking': 'مرحباً بك! يسعدنا مساعدتك في تتبع طلبك. يرجى تزويدنا برقم الطلب (مثال: CMD-12345) لنتحقق من حالته.',
    'Product Information': 'يسعدنا تزويدك بمعلومات عن منتجاتنا. أخبرنا باسم المنتج وسنوضح لك السعر والتوفر والمقاسات والضمان.',
    'Complaint': 'نعتذر عن هذه التجربة. نريد فهم المشكلة لنجد لك الحل المناسب. هل يمكنك وصف ما حدث وذكر رقم الطلب؟',
    'Refund Request': 'بالتأكيد! يمكننا مساعدتك في طلب الاسترجاع. يرجى تزويدنا برقم الطلب وسبب الإرجاع (سياسة تجريبية: 14 يوماً).',
    'Technical Support': 'نأسف للمشكلة التقنية. جرّب تحديث الصفحة أو التطبيق ثم أعد تسجيل الدخول. إن استمرت المشكلة، أخبرنا بنوع الجهاز ورسالة الخطأ.',
    fallback: 'مرحباً! يمكنني مساعدتك في تتبع الطلبات، معلومات المنتجات، الشكاوى، الاسترجاع والدعم التقني. كيف أساعدك؟',
    greet: 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟', thanks: 'على الرحب والسعة! هل هناك شيء آخر أساعدك فيه؟',
    hours: 'ساعات العمل (تجريبية): من الاثنين إلى الجمعة، من 9:00 إلى 18:00.'
  },
  darija: {
    'Order Tracking': 'مرحباً بك! يسعدنا مساعدتك في تتبع طلبك. عافاك عطينا رقم الطلب ديالك (مثلاً CMD-12345) باش نشوفو ليك فين وصل.',
    'Product Information': 'بكل سرور! قول لينا اسم المنتوج اللي بغيتي وغادي نعطيوك التمن، واش متوفر، المقاسات والضمان.',
    'Complaint': 'كنعتاذرو ليك على هاد التجربة. بغينا نفهمو المشكل باش نلقاو ليك الحل المناسب. عافاك شرح لينا شنو وقع وعطينا رقم الطلب.',
    'Refund Request': 'مرحباً! نقدرو نعاونوك فطلب الاسترجاع. عافاك عطينا رقم الطلب وعلاش بغيتي ترجع المنتوج (سياسة تجريبية: 14 يوم).',
    'Technical Support': 'كنعتاذرو على المشكل التقني. جرب تحيّن الصفحة ولا التطبيق وعاود دخل لحسابك. وإلا بقا المشكل، قول لينا نوع التيليفون ورسالة الخطأ.',
    fallback: 'مرحباً! نقدر نعاونك فتتبع الطلبات، معلومات على المنتوجات، الشكايات، الاسترجاع والدعم التقني. كيفاش نقدر نعاونك؟',
    greet: 'مرحباً بك! كيفاش نقدر نعاونك اليوم؟', thanks: 'الله يحفظك! واش بغيتي شي حاجة أخرى؟',
    hours: 'أوقات العمل (تجريبية): من الإثنين للجمعة، من 9:00 حتى 18:00.'
  },
  fr: {
    'Order Tracking': 'Bonjour ! Je serais ravi de vous aider à suivre votre commande. Pouvez-vous m’indiquer votre numéro de commande (ex. CMD-12345) ?',
    'Product Information': 'Avec plaisir ! Indiquez-moi le nom du produit et je vous renseignerai sur le prix, la disponibilité, les tailles et la garantie.',
    'Complaint': 'Nous sommes désolés pour cette expérience. Nous voulons comprendre le problème afin de trouver la solution adaptée. Pouvez-vous nous décrire ce qui s’est passé et nous donner votre numéro de commande ?',
    'Refund Request': 'Bien sûr ! Nous pouvons vous aider avec votre demande de retour. Merci de nous indiquer votre numéro de commande et le motif du retour (politique de démonstration : 14 jours).',
    'Technical Support': 'Nous sommes désolés pour ce problème technique. Essayez d’actualiser la page ou l’application, puis reconnectez-vous. Si le problème persiste, indiquez-nous votre appareil et le message d’erreur.',
    fallback: 'Bonjour ! Je peux vous aider pour le suivi de commande, les informations produit, les réclamations, les retours et le support technique. Comment puis-je vous aider ?',
    greet: 'Bonjour ! Comment puis-je vous aider aujourd’hui ?', thanks: 'Avec plaisir ! Puis-je vous aider pour autre chose ?',
    hours: 'Horaires (démo) : du lundi au vendredi, de 9h00 à 18h00.'
  }
};
// Simulated order statuses, chosen by the last digit of the order number (demo only)
const STATUS = {
  ar: ['قيد التحضير', 'تم الشحن', 'في الطريق إليك', 'تم التسليم'],
  darija: ['كيتحضر', 'تشحن', 'فالطريق ليك', 'تسلّم'],
  fr: ['en préparation', 'expédiée', 'en cours de livraison', 'livrée']
};
const STATUS_LINE = {
  ar: (id, s) => '📦 الطلب ' + id + ': ' + s + ' (حالة تجريبية).',
  darija: (id, s) => '📦 الطلب ' + id + ': ' + s + ' (حالة تجريبية).',
  fr: (id, s) => '📦 Commande ' + id + ' : ' + s + ' (statut simulé pour la démo).'
};

/* ---------- 5. ENGINE ---------- */

/** Full pipeline: detect language → classify intent → build reply. */
function respond(text) {
  const tokens = tokenize(text);
  const language = detectLanguage(text, tokens);
  const c = classify(tokens);
  const set = REPLIES[language.key];
  let reply = set[c.intent === 'General Questions' ? c.sub : c.intent];
  if (c.intent === 'Order Tracking') {                       // optional order number → simulated status
    const m = text.match(/(?:cmd|ord|#)?\s*-?\s*(\d{4,8})/i);
    if (m) reply += '\n\n' + STATUS_LINE[language.key]('CMD-' + m[1], STATUS[language.key][+m[1].slice(-1) % 4]);
  }
  return { language, intent: c.intent, matched: c.matched, reply };
}
if (typeof module !== 'undefined') module.exports = { respond, norm };

/* ---------- 6. USER INTERFACE ---------- */
if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  const SLUG = { 'Order Tracking': 'order', 'Product Information': 'product', 'Complaint': 'complaint', 'Refund Request': 'refund', 'Technical Support': 'tech', 'General Questions': 'general' };
  const QUICK = [
    ['بغيت نعرف فين وصل الطلب ديالي؟', 'Darija · Order tracking'], ['Je voudrais retourner mon produit.', 'French · Refund request'],
    ['الخدمة ديالكم ما عجباتنيش.', 'Darija · Complaint'], ['ما هو سعر هذا المنتج وهل هو متوفر؟', 'Arabic · Product information'],
    ['Je n’arrive pas à me connecter à mon compte.', 'French · Technical support'], ['Quels sont vos horaires d’ouverture ?', 'French · General question']];
  let busy = false;

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const scroll = () => { const m = $('messages'); m.scrollTop = m.scrollHeight; };

  /** Appends a chat bubble. meta (optional) = {intent, language} for bot replies. */
  function addMessage(role, text, meta) {
    const d = document.createElement('div');
    d.className = 'msg ' + role;
    d.innerHTML = '<div class="bubble" dir="auto">' + esc(text) + '</div><div class="meta">' +
      (meta ? '<span class="tag i-' + SLUG[meta.intent] + '">' + meta.intent + '</span><span class="tag lang">🌐 ' + meta.language + '</span>' : '') +
      '<span>' + time() + '</span></div>';
    $('messages').appendChild(d); scroll();
  }
  function setTyping(on) {
    const old = $('typing'); if (old) old.remove();
    if (!on) return;
    const d = document.createElement('div');
    d.id = 'typing'; d.className = 'msg bot typing'; d.setAttribute('aria-label', 'Assistant is typing');
    d.innerHTML = '<div class="bubble"><i></i><i></i><i></i></div>';
    $('messages').appendChild(d); scroll();
  }
  function welcome() {
    addMessage('bot', 'مرحباً بك! أنا المساعد الافتراضي التجريبي لمتجر Atlas Shop (متجر وهمي).\nBienvenue ! Je suis l’assistant virtuel de démonstration d’Atlas Shop (boutique fictive).\nكتب ليا بالعربية، بالدارجة ولا بالفرنسية 💬 · Écrivez-moi en arabe, darija ou français.');
  }

  /** Validates, shows the user bubble, simulates typing, then replies. */
  function send(raw) {
    const text = (raw || '').trim();
    $('error').textContent = '';
    if (busy) { $('error').textContent = 'Please wait for the assistant to reply.'; return; }
    if (!text) { $('error').textContent = 'Please type a message first.'; $('input').focus(); return; }
    busy = true; $('send').disabled = true;
    addMessage('user', text);
    $('input').value = '';
    setTyping(true);
    let r;
    try { r = respond(text); } catch (e) { r = null; }
    setTimeout(() => {
      setTyping(false);
      if (r) {
        addMessage('bot', r.reply, { intent: r.intent, language: r.language.label });
        $('detLang').textContent = r.language.label;
        $('detIntent').innerHTML = '<span class="tag i-' + SLUG[r.intent] + '">' + r.intent + '</span>';
        $('detKw').textContent = r.matched.length ? r.matched.join(' · ') : 'none (fallback reply)';
      } else addMessage('bot', 'Sorry, something went wrong. Please try again. / عذراً، حدث خطأ. حاول مرة أخرى.');
      busy = false; $('send').disabled = false; $('input').focus();
    }, 600 + Math.min(text.length * 8, 600));
  }

  $('form').addEventListener('submit', e => { e.preventDefault(); send($('input').value); });
  $('clear').onclick = () => {
    $('messages').innerHTML = ''; $('error').textContent = '';
    ['detLang', 'detIntent', 'detKw'].forEach(id => { $(id).textContent = '–'; });
    busy = false; $('send').disabled = false; welcome();
  };
  $('quick').innerHTML = QUICK.map((q, i) => '<button class="btn" data-i="' + i + '"><span dir="auto">' + q[0] + '</span><small>' + q[1] + '</small></button>').join('');
  $('quick').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(QUICK[+b.dataset.i][0]); });
  $('legend').innerHTML = Object.keys(SLUG).map(k => '<li class="i-' + SLUG[k] + '"><i></i><span style="color:var(--text)">' + k + '</span></li>').join('');
  $('yr').textContent = new Date().getFullYear();
  welcome();
}
