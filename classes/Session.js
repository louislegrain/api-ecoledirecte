const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const Eleve = require('./Eleve');

module.exports = class Session {
   /**
    * @constructor
    * @param {String} [token]
    * @param {String} [userAgent]
    */
   constructor(token, userAgent) {
      this.token = token || '';
      this.userAgent = userAgent || new UserAgent().toString();
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
            acceptationCharte: true,
         })
            .then(data => {
               const account = data.accounts[0];
               const type =
                  account.typeCompte === '1' || account.typeCompte === '2'
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
         const res = await fetch(`https://api.ecoledirecte.com/v3${path}`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
               'User-Agent': this.userAgent,
               'X-Token': this.token,
            },
            body: new URLSearchParams({ data: JSON.stringify(payload) }).toString(),
         }).catch(() => null);
         let data = await res?.text?.()?.catch(() => null);
         if (!data) return reject({ message: 'Une erreur est survenue' });

         try {
            data = JSON.parse(data);
         } catch (e) {
            return reject({ message: 'Une erreur est survenue', edMessage: data });
         }

         if (data.code !== 200) {
            reject({
               code: data.code,
               edMessage: data.message,
               message:
                  {
                     210: 'Aucune donnée disponible',
                     240: "La charte d'utilisation n'a pas été acceptée",
                     505: 'Identifiant ou mot de passe invalide',
                     516: "L'établissement a fermé EcoleDirecte",
                     520: 'Token invalide',
                     525: 'Session expirée',
                     535: "L'établissement a fermé EcoleDirecte",
                  }[data.code] || 'Une erreur est survenue',
            });
            return;
         }

         this.token = data.token;

         resolve(data.data);
      });
   }
};
