# Project 03 – AI Customer Support Chatbot (Arabic · Moroccan Darija · French)

A SaaS-style customer support chatbot demo for a **fictional store (Atlas Shop)**. It detects the customer's language and intent and replies with predefined templates.

> **Educational prototype.** The assistant is **rule-based** (keyword scoring and reply templates). It does **not** use a trained AI model, an external API or a server. Order statuses and policies are simulated demo content.

## Files
`index.html` · `style.css` · `script.js` · `README.md`

## Features
Chat with welcome message, typing indicator, timestamps and clear-conversation button · quick question buttons · detected language and intent badges · live detection panel with matched keywords · input validation and error handling · responsive layout with right-to-left support.

## Supported intents
Order Tracking · Product Information · Complaint · Refund Request · Technical Support · General Questions (greetings, thanks, opening hours, and a fallback reply).

## How it works
1. **Normalize** text (accents, Arabic diacritics and letter variants).
2. **Detect language:** Arabic script plus Darija markers (بغيت، فين، ديال، the "-ش" negation…) → Darija; otherwise Arabic. Latin script: Arabizi markers → Darija, French words → French. Unknown text gets a French reply.
3. **Score intents** with weighted keyword lists in `script.js`. The highest score wins; ties follow a fixed priority; no match → General fallback.
4. **Reply** from templates in the detected language. If you type an order number (e.g. `CMD-12345`), a **simulated** status is added.

## Test conversations
| Message | Intent | Reply starts with |
|---|---|---|
| بغيت نعرف فين وصل الطلب ديالي؟ | Order Tracking | مرحباً بك! يسعدنا مساعدتك في تتبع طلبك. |
| Je voudrais retourner mon produit. | Refund Request | Bien sûr ! Nous pouvons vous aider avec votre demande de retour. |
| الخدمة ديالكم ما عجباتنيش. | Complaint | كنعتاذرو ليك على هاد التجربة. |

Each has a quick-question button. Node check: `node -e "console.log(require('./script.js').respond('Je voudrais retourner mon produit.'))"`.

## Run locally
Put the four files in one folder and open `index.html` in a browser. No installation needed.

## Customize
Edit `KEYWORDS`, `GENERAL` (what to detect) and `REPLIES` (what to say) in `script.js`.

## Publish on GitHub Pages
1. Create a public repository and upload the four files (**Add file → Upload files**). Put them in the repository root, or in a folder such as `chatbot/` to keep it next to your other projects.
2. **Settings → Pages**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
3. After about a minute, the app is at `https://<username>.github.io/<repository>/` (add `/chatbot/` if you used a folder).

## Limitations
Small vocabulary, no spelling-error tolerance beyond normalization, no conversation memory, no English.
