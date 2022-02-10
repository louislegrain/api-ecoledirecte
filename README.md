# api-ecoledirecte

[![versionBadge](https://img.shields.io/npm/v/api-ecoledirecte?style=for-the-badge)](https://npmjs.com/api-ecoledirecte)

## Fonctionnalités

🔒 Support des comptes **élèves** et **famille**  
📥 Récupération de la **vie scolaire**  
📥 Récupération de la **vie de classe**  
📥 Récupération des **notes**  
📥 Récupération des **messages**  
📥 Récupération de **l'emploi du temps**  
📥 Récupération de **l'agenda**  
📥 Récupération des **documents**  
✅ Support **JSDoc**  

## Installation

```bash
npm i api-ecoledirecte
```

## Example

```javascript
const { Session } = require('api-ecoledirecte');

const session = new Session();

(async () => {
   await session.login('identifiant', 'motdepasse').catch(err => {
      console.log('Impossible de se connecter : ' + err);
   });

   const notes = await session.accounts?.[0].fetchNotes();
   console.log(notes);
})();
```