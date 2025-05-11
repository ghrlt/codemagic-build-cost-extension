# Codemagic Build Cost Viewer

Une extension Chrome légère pour injecter le coût estimé de chaque build directement dans l’interface web de Codemagic.

## ⚙️ Fonctionnalités

- **Coût par build** : Affiche, sous chaque build, le coût calculé en temps réel : 💸 `$EUR` (ou autre devise selon votre configuration Codemagic).
- **Détails de build** : Sur la page de détails d’un build, un encart résume le coût total estimé.
- **Tarification à jour** : Récupère automatiquement vos plans tarifaires depuis l’API Codemagic.

## 🚀 Installation

Obtenez l'extension directement depuis le [Chrome Web Store](https://chromewebstore.google.com/detail/eakkcahigoddpfieijdbmdiffcihebik) !

1. **Cloner le dépôt** :
   ```bash
   git clone git@github.com:ghrlt/codemagic-build-cost-extension.git
   ```
2. **Charger l’extension dans Chrome** :
   - Ouvrez `chrome://extensions`
   - Activez le **Mode développeur**
   - Cliquez sur **Charger l’extension non empaquetée**
   - Sélectionnez le dossier du projet cloné
3. **Naviguer sur Codemagic** :
   Rendez-vous sur `https://codemagic.io/builds` ou la page de détails d’un build ; les coûts apparaîtront automatiquement.

## 📁 Structure du projet

```
codemagic-cost-details/
├── content.js         # Script principal injecté dans la page
├── page_inject.js     # Patch XHR pour capturer les données de build
├── manifest.json      # Déclaration de l’extension (permissions, scripts, icônes)
├── LICENSE            # Licence GNU GPL v3
└── icons/             # Icônes pour l’extension
```

## 🤝 Contribution

Les Pull Requests et les Issues sont les bienvenues ! :heart:

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Implémentez, testez et validez vos changements
4. Ouvrez une Pull Request

## 📄 Licence

Cette extension est distribuée sous la **GNU General Public License v3**. Consultez le fichier [`LICENSE`](LICENSE) pour plus de détails.

