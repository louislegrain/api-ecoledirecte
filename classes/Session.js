const fetch = require('node-fetch');
const UserAgent = require('user-agents');
const Eleve = require('./Eleve');
const errors = require('../utils/errors.json');

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
    * @returns {Promise}
    */
   fetchGTKToken() {
      return new Promise(async (resolve, reject) => {
         const res = await fetch('https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.80.2', {
            headers: {
               'User-Agent': this.userAgent,
            },
         }).catch(() => null);

         const match = res?.headers
            .get('set-cookie')
            ?.match(/GTK=([^;]+);.+domain=ecoledirecte\.com, (.+)=\1/);

         if (!match) return reject({ message: 'Impossible de récupérer le token GTK.' });
         resolve([match[1], `GTK=${match[1]}; ${match[2]}=${match[1]}`]);
      });
   }

   /**
    * @param {String} identifiant
    * @param {String} motdepasse
    * @returns {Promise}
    */
   fetch2FAQuestion(identifiant, motdepasse) {
      if (!identifiant || !motdepasse)
         throw new Error("Nom d'utilisateur ou mot de passe non renseigné.");

      return new Promise(async (resolve, reject) => {
         const success = await this.login(identifiant, motdepasse)
            .then(() => {
               reject({
                  message: "L'authentification à deux facteurs est désactivée sur ce compte.",
               });
               return false;
            })
            .catch(err => {
               if (err.code === 250) return true;
               reject(err);
               return false;
            }); // fetch token
         if (!success) return;

         this.request('/connexion/doubleauth.awp?verbe=get')
            .then(data =>
               resolve({
                  rawQuestion: data.question,
                  rawPropositions: data.propositions,
                  question: Buffer.from(data.question, 'base64').toString('utf8'),
                  propositions: data.propositions.map(proposition =>
                     Buffer.from(proposition, 'base64').toString('utf8')
                  ),
               })
            )
            .catch(err => reject(err));
      });
   }

   /**
    * @param {String} choix
    * @returns {Promise}
    */
   fetch2FACreds(choix) {
      if (!choix) throw new Error('Choix non renseigné.');

      return new Promise((resolve, reject) => {
         this.request('/connexion/doubleauth.awp?verbe=post', { choix })
            .then(data => resolve(data))
            .catch(err => reject(err));
      });
   }

   /**
    * @param {String} identifiant
    * @param {String} motdepasse
    * @param {Object} fa
    * @param {String} fa.cn
    * @param {String} fa.cv
    * @returns {Promise}
    */
   login(identifiant, motdepasse, fa) {
      if (!identifiant || !motdepasse)
         throw new Error("Nom d'utilisateur ou mot de passe non renseigné.");

      return new Promise(async (resolve, reject) => {
         const gtkToken = await this.fetchGTKToken().catch(err => {
            reject(err);
            return null;
         });
         if (!gtkToken) return;

         this.request(
            '/login.awp',
            {
               identifiant,
               motdepasse,
               acceptationCharte: true,
               ...fa,
            },
            {
               'X-Gtk': gtkToken[0],
               Cookie: gtkToken[1],
            }
         )
            .then(data => {
               const account = data.accounts[0];
               const type =
                  account.typeCompte === '1' || account.typeCompte === '2'
                     ? 'FAMILLE'
                     : account.typeCompte === 'E'
                     ? 'ELEVE'
                     : null;
               if (!type) {
                  reject({ message: "Ce type de compte n'est pas pris en charge." });
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
   request(path, payload = {}, headers = {}) {
      if (!path) throw new Error('Chemin non renseigné.');

      return new Promise(async (resolve, reject) => {
         const res = await fetch(`https://api.ecoledirecte.com/v3${path}`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
               'User-Agent': this.userAgent,
               'X-Token': this.token,
               ...headers,
            },
            body: new URLSearchParams({ data: JSON.stringify(payload) }).toString(),
         }).catch(() => null);
         let data = await res?.text?.()?.catch(() => null);
         if (!data) return reject({ message: errors.default });

         try {
            data = JSON.parse(data);
         } catch (e) {
            return reject({ message: errors.default, edMessage: data });
         }

         if (data.token) this.token = data.token;

         if (data.code !== 200) {
            reject({
               code: data.code,
               edMessage: data.message,
               message: errors[data.code] || errors.default,
            });
            return;
         }

         resolve(data.data);
      });
   }
};
