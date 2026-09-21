# Fidélité SaaS — cartes de fidélité digitales multi-commerçants

Plateforme multi-tenant : chaque commerçant configure son programme (passages
ou points), ses clients ajoutent leur carte à Apple Wallet / Google Wallet,
la carte remonte sur le lockscreen à proximité du magasin, et le commerçant
peut notifier tous ses clients d'une promo.

Stack : Next.js 14 (App Router) · Supabase (Postgres + RLS + Auth + Storage) ·
passkit-generator · Google Wallet API · html5-qrcode.

## Les surfaces

| URL                     | Qui               | Quoi                                                   |
| ----------------------- | ----------------- | ------------------------------------------------------ |
| `/m/[slug]/inscription` | Client final      | Création de carte, brandée au commerce                 |
| `/m/[slug]/compte`      | Client final      | Solde, progression, re-téléchargement                  |
| `/scan`                 | Employé en caisse | PWA : appairage par code, scan QR, crédit, récompenses |
| `/dashboard`            | Gérant            | Email + mot de passe : promo, caisses, clients         |
| `/admin`                | Toi (plateforme)  | Back-office : création des comptes commerçants         |
| `/definir-mot-de-passe` | Gérant invité     | Atterrissage du lien d'invitation                      |

## Architecture des accès

- **Dashboard** → Supabase avec le JWT du gérant : le RLS (`my_merchant_id()`)
  cloisonne les lectures. Les écritures passent par `/api/dashboard/*`
  (vérification du JWT côté serveur) car elles déclenchent les push wallet.
- **Scanner** → token d'appareil (`Authorization: Device <token>`), obtenu en
  échangeant un code d'appairage à 6 chiffres généré depuis le dashboard.
  Stocké hashé (sha256) dans `devices`, révocable à distance.
- **Client final / web service Apple** → service_role côté serveur uniquement.
- **Anti brute-force** (`lib/rateLimit.ts`, table `rate_limit_hits`) : limite
  par IP sur `/api/scan/pair` (10/10 min) et `/api/m/[slug]/signup` (10/h) —
  pas de service externe, tout reste sur Supabase.

## Le moteur de points

Toute variation de solde est une ligne `transactions` (earn / redeem / adjust).
Un trigger SQL met à jour le cache `customers.points`, refuse un solde négatif,
applique la limite "N passages / jour" (mode visits) et bump `updated_at` —
ce qui alimente le `passesUpdatedSince` du web service Apple. Après chaque
transaction, `lib/loyalty.ts` pousse la mise à jour vers les deux wallets.

## Setup

1. **Supabase** : exécuter `supabase/schema.sql`, créer un bucket Storage
   `pass-assets` (privé). Activer l'auth par email (magic link).
2. **Apple** (99 €/an, un seul compte pour toute la plateforme) : Pass Type ID
   - certificat exporté en PEM + clé APNs .p8 — même procédure que la V1,
     détaillée dans les commentaires de `.env.example`.
   ```bash
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out signerCert.pem -legacy
   openssl pkcs12 -in pass.p12 -nocerts -out signerKey.pem -legacy
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   base64 -i signerCert.pem   # → .env
   ```
3. **Google** : Issuer ID (Wallet Console) + service account avec le rôle
   Wallet Object Issuer. La loyaltyClass de chaque commerce est créée
   automatiquement au premier pass Google.
4. **Images par défaut** : placer dans `assets/pass-defaults/` les 6 images
   (icon/logo/strip en @1x @2x) utilisées tant qu'un commerce n'a pas son logo.
5. `npm install && cp .env.example .env && npm run dev` — puis tunnel HTTPS
   (ngrok/cloudflared) obligatoire pour tester le web service Apple.

## Onboarding d'un commerçant (flux nominal)

1. **Toi** : connexion sur `/admin` (ton email doit être dans
   `PLATFORM_ADMIN_EMAILS` du `.env`, et ton compte créé dans
   Supabase → Authentication → Users → Add user, avec Auto Confirm).
2. Formulaire "Nouveau commerçant" : nom, slug, email du gérant, type de
   programme, première récompense → **Créer**.
3. Le gérant reçoit l'email d'invitation Supabase → clique → arrive sur
   `/definir-mot-de-passe` → choisit son mot de passe → dashboard.

⚠️ Config Supabase requise pour les invitations :

- Authentication → **URL Configuration → Redirect URLs** : ajouter
  `http://localhost:3000/definir-mot-de-passe` (puis l'URL de prod).
- Le template de l'email s'édite dans Authentication → **Email Templates →
  Invite user** (par défaut il est en anglais — à franciser avant tes
  premiers vrais clients).
- Le SMTP intégré est limité (~2 emails/heure) : brancher un SMTP custom
  (Resend) dans Project Settings → Auth → SMTP avant la prod.

## Reste à faire (backlog V1 → V2)

- Upload logo (→ sharp → bucket pass-assets) + géocodage adresse depuis /admin
- Renvoyer une invitation / reset mot de passe depuis /admin
- Stripe Billing + webhook → subscription_status
- Re-push de tous les passes d'un merchant quand il change son design
- PDF chevalet de comptoir (QR vers /m/[slug]/inscription)
- Page /dashboard : gestion des récompenses et liste des devices avec révocation

# fiduo
