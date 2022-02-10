const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const Eleve = require('./Eleve');

module.exports = class Session {
   constructor() {
      this.token = '';
      this.userAgent = new UserAgent().toString();
      this.accounts = [];
   }

   /**
    * @param {String} identifiant
    * @param {String} motdepasse
    * @returns {Promise}
    */
   login(identifiant, motdepasse) {
      if (!identifiant || !motdepasse)
         throw new Error("Nom d'utilisateur ou mot de passe non renseigné.");

      return new Promise((resolve, reject) => {
         this.request('/login.awp', {
            identifiant,
            motdepasse,
         })
            .then(data => {
               const account = data.accounts[0];
               const type =
                  account.typeCompte === '1'
                     ? 'FAMILLE'
                     : account.typeCompte === 'E'
                     ? 'ELEVE'
                     : null;
               if (!type) {
                  reject("Ce type de compte n'est pas pris en charge.");
                  return;
               }

               /**
                * @type {Eleve[]}
                */
               this.accounts =
                  type === 'ELEVE'
                     ? [new Eleve(this, account)]
                     : account.profile.eleves.map(account => new Eleve(this, account));

               resolve();
            })
            .catch(err => reject(err));
      });
   }

   /**
    * @param {String} path
    * @param {Object} [payload]
    * @returns {Promise}
    */
   request(path, payload = {}) {
      if (!path) throw new Error('Chemin non renseigné.');

      return new Promise(async (resolve, reject) => {
         try {
            const res = await fetch(`https://api.ecoledirecte.com/v3${path}`, {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': this.userAgent,
                  'X-Token': this.token,
               },
               body: `data=${JSON.stringify(payload)}`,
            });
            const data = await res.json();

            if (data.code < 200 || data.code >= 300) {
               reject(data.message);
               return;
            }

            this.token = data.token;

            resolve(data.data);
         } catch (e) {
            reject(e);
         }
      });
   }
};
