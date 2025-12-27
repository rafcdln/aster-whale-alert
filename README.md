# 🐋 Aster Whale Alert Bot

Bot Telegram qui alerte en temps réel sur les gros achats du token ASTER sur BSC.

## 📱 Utilisation

Rejoins le bot sur Telegram: [@AsterWhaleAlertBot](https://t.me/AsterWhaleAlertBot)

### Commandes

| Commande | Description |
|----------|-------------|
| `/start` | S'abonner aux alertes |
| `/stop` | Se désabonner |
| `/stats` | Statistiques des alertes |
| `/price` | Prix actuel d'ASTER |
| `/threshold` | Seuil d'alerte actuel |
| `/help` | Aide |

## 🚀 Installation

```bash
# Cloner le repo
git clone <repo-url>
cd aster-whale-alert

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes clés

# Lancer le bot
npm start
```

## ⚙️ Configuration

Créer un fichier `.env`:

```env
TELEGRAM_BOT_TOKEN=ton_token_telegram
BSCSCAN_API_KEY=ta_cle_bscscan
ASTER_CONTRACT=0x000Ae314E2A2172a039B26378814C252734f556A
MIN_ALERT_USD=5000
POLL_INTERVAL=30
```

## 📊 Fonctionnalités

- ✅ Alertes en temps réel des gros achats
- ✅ Système d'abonnement public
- ✅ Statistiques des dernières 24h
- ✅ Détection automatique des whales
- ✅ Liens directs vers BscScan

## 🛠️ Structure

```
├── src/
│   ├── index.js      # Bot principal
│   ├── config.js     # Configuration
│   ├── storage.js    # Persistance des données
│   └── bscscan.js    # API BscScan
├── data/             # Données persistantes
├── .env              # Variables d'environnement
└── package.json
```

## 📝 License

MIT
