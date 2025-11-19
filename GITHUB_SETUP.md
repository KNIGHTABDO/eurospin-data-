# Configuration GitHub pour NeuroSpin

Ce guide vous explique comment configurer votre dépôt GitHub pour gérer les **licences** et les **mises à jour** de l'application.

## 1. Créer un dépôt GitHub

1.  Allez sur [GitHub](https://github.com) et créez un nouveau dépôt (ex: `neurospin-data`).
2.  Assurez-vous que le dépôt est **Public** (pour que l'application puisse lire les fichiers sans token complexe).
    _Note : Pour une vraie application commerciale, vous devriez utiliser une API privée, mais pour ce projet, un dépôt public est la solution la plus simple._

## 2. Créer le fichier de Licences (`licenses.json`)

Créez un fichier nommé `licenses.json` dans votre dépôt avec le contenu suivant :

```json
{
  "licenses": [
    {
      "key": "NEURO-DEMO-2025",
      "isActive": true,
      "owner": "Utilisateur Démo"
    },
    {
      "key": "PRO-KEY-1234",
      "isActive": true,
      "owner": "Dr. Strange"
    },
    {
      "key": "OLD-KEY-0000",
      "isActive": false,
      "owner": "Ancien Utilisateur"
    }
  ]
}
```

## 3. Créer le fichier de Mises à jour (`metadata.json`)

Créez un fichier nommé `metadata.json` dans votre dépôt. C'est ce fichier que l'application vérifiera pour savoir si une nouvelle version est disponible.

```json
{
  "version": "1.0.1",
  "releaseNotes": "• Ajout de nouvelles images IRM (Genou)\n• Correction de bugs mineurs\n• Amélioration des performances",
  "downloadUrl": "https://github.com/VOTRE_NOM/VOTRE_REPO_APP/releases/latest",
  "forceUpdate": false
}
```

- **version** : La version la plus récente de votre application. Si elle est supérieure à la version actuelle de l'app (définie dans `constants.ts`), la notification s'affichera.
- **downloadUrl** : Le lien où l'utilisateur peut télécharger le nouvel installateur `.exe`.

## 4. Connecter l'application à GitHub

Une fois vos fichiers créés, vous devez obtenir leurs liens "Raw".

1.  Ouvrez le fichier sur GitHub.
2.  Cliquez sur le bouton **Raw** en haut à droite du fichier.
3.  Copiez l'URL de la barre d'adresse (elle devrait commencer par `https://raw.githubusercontent.com/...`).

### Mettre à jour le code

Ouvrez le projet dans VS Code et modifiez les fichiers suivants avec vos nouvelles URLs :

**Dans `services/licenseService.ts` :**

```typescript
const LICENSE_DB_URL =
  "https://raw.githubusercontent.com/VOTRE_NOM/neurospin-data/main/licenses.json";
```

**Dans `services/updateService.ts` :**

```typescript
const METADATA_URL =
  "https://raw.githubusercontent.com/VOTRE_NOM/neurospin-data/main/metadata.json";
```

## 5. Publier une mise à jour

Pour publier une mise à jour :

1.  Générez le nouvel exécutable (`npm run electron:build`).
2.  Mettez l'exécutable en ligne (par exemple dans les "Releases" de GitHub).
3.  Mettez à jour le fichier `metadata.json` sur GitHub avec le nouveau numéro de version et le lien de téléchargement.
4.  Les utilisateurs verront automatiquement la notification au prochain lancement !
