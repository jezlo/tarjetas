# Adding a New Language to Tarjetas

This guide explains how to add support for a new language in the i18n system.

## Files involved

| File | Purpose |
|------|---------|
| `frontend/src/locales/<code>.json` | Translation strings for the language |
| `frontend/src/contexts/LanguageContext.js` | Registers the language and makes it available |
| `frontend/src/components/Auth/UserProfile.js` | Language selector UI in user profile |
| `frontend/src/components/Auth/Login.js` | Language selector on login screen |
| `frontend/src/components/Auth/Register.js` | Language selector on register screen |
| `backend/routes/auth.py` | Backend validation of allowed language codes |

## Step-by-step

### 1. Create the translation file

Copy `frontend/src/locales/es.json` (or `en.json`) and save it as
`frontend/src/locales/<code>.json`, where `<code>` is the [BCP 47 language
tag](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry)
(e.g. `fr` for French, `pt` for Portuguese, `de` for German).

Translate every value in the new file. **Do not change the keys**, only the values.

```jsonc
// frontend/src/locales/fr.json (example)
{
  "app": { "name": "Tarjetas" },
  "nav": {
    "dashboard": "Tableau de bord",
    "decks": "Paquets",
    // …
  }
  // …
}
```

### 2. Register the language in LanguageContext

Open `frontend/src/contexts/LanguageContext.js` and make three changes:

```js
// a) Add the import at the top of the file
import fr from '../locales/fr.json';

// b) Add it to the translations map
const translations = { en, es, fr };

// c) Add the code to SUPPORTED_LANGUAGES
const SUPPORTED_LANGUAGES = ['es', 'en', 'fr'];
```

### 3. Add the language option to the UI selectors

There are three places where users can choose the language:

**UserProfile** (`frontend/src/components/Auth/UserProfile.js`):

```jsx
<button onClick={() => handleLanguageChange('fr')} …>
  🇫🇷 {t('profile.languageFrench')}
</button>
```

**Login** and **Register** (`frontend/src/components/Auth/Login.js` and
`Register.js`):

```jsx
<option value="fr">Français</option>
```

### 4. Add translation keys for the new language name

In **every** locale file add the new label so users see the language name
in their own language. For example, in `es.json`:

```json
"profile": {
  …
  "languageFrench": "Francés"
}
```

And in `en.json`:

```json
"profile": {
  …
  "languageFrench": "French"
}
```

And in the new `fr.json`:

```json
"profile": {
  …
  "languageFrench": "Français"
}
```

### 5. Allow the code in the backend

Open `backend/routes/auth.py` and add the new code to the tuple of allowed
values:

```python
if language and language in ('es', 'en', 'fr'):
    user.language = language
```

Also add it to the `User.language` column default comment in
`backend/models.py` if desired.

### 6. Test the new language

1. Run the frontend development server: `npm start` inside `frontend/`.
2. Log in and navigate to **Profile**.
3. Select the new language and verify that the UI switches immediately.
4. Reload the page and confirm the preference is remembered.
5. Log out, log in again — the preference should be restored from the
   database.

---

## Translation key conventions

- Keys are **dot-separated** namespaces: `nav.dashboard`, `viewer.cardOf`, etc.
- Interpolation uses `{variable}` placeholders: `"Welcome, {name}!"`.
- Emoji and icons that are part of functionality (e.g. `🔀`) should be
  **kept as-is** in the values; they are not translatable strings.
- Card content (questions and answers) is **never translated** — only the
  interface chrome.
