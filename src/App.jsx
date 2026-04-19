import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uqrqfwhvchpcmzrfqoyd.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnFmd2h2Y2hwY216cmZxb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTg2MjMsImV4cCI6MjA5MTkzNDYyM30.ZkEVewnjomnh7O1-Z30Luq8wbMoLvoCxmlZbt8errBs";
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23liG47Hl2rb25GTRx";
const SLACK_CLIENT_ID = import.meta.env.VITE_SLACK_CLIENT_ID || "10931107133861.10932502957734";


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
const DEMO_ORG = { id:"demo", name:"Acme Corp (Demo)" };
const DEMO_PROFILE = { id:"demo", org_id:"demo", full_name:"Alex Johnson", role:"ciso", language:"en" };
const DEMO_PLATFORMS = [
  { id:"p1", name:"GitHub", last_synced_at: new Date(Date.now()-3600000).toISOString() },
  { id:"p2", name:"Slack", last_synced_at: new Date(Date.now()-7200000).toISOString() },
];
const DEMO_APPS = [
  { id:"a1", name:"SlackBot Pro", platform:{name:"Slack"}, connection_type:"OAuth", risk_score:92, severity:"critical", verified:false, is_stale:false, is_revoked:false, users_affected:312, users_type:"users", connected_at:new Date(Date.now()-86400000*90).toISOString(), last_active_at:new Date(Date.now()-86400000*45).toISOString(), permissions:[{id:"p1",scope:"channels:history",is_high_risk:true},{id:"p2",scope:"files:read",is_high_risk:false},{id:"p3",scope:"admin",is_high_risk:true}], compliance:[] },
  { id:"a2", name:"DeployHelper", platform:{name:"GitHub"}, connection_type:"OAuth", risk_score:88, severity:"critical", verified:false, is_stale:true, is_revoked:false, users_affected:5, users_type:"repos", connected_at:new Date(Date.now()-86400000*120).toISOString(), last_active_at:new Date(Date.now()-86400000*95).toISOString(), permissions:[{id:"p4",scope:"repo:write",is_high_risk:true},{id:"p5",scope:"admin:org",is_high_risk:true}], compliance:[{framework:{name:"SOC 2",short_code:"soc2"}}] },
  { id:"a3", name:"DataSync360", platform:{name:"Slack"}, connection_type:"API Key", risk_score:74, severity:"high", verified:true, is_stale:false, is_revoked:false, users_affected:18000, users_type:"records", connected_at:new Date(Date.now()-86400000*60).toISOString(), last_active_at:new Date(Date.now()-86400000*2).toISOString(), permissions:[{id:"p6",scope:"contacts:read",is_high_risk:true},{id:"p7",scope:"channels:read",is_high_risk:false}], compliance:[{framework:{name:"GDPR",short_code:"gdpr"}}] },
  { id:"a4", name:"Zoom", platform:{name:"Slack"}, connection_type:"OAuth", risk_score:65, severity:"high", verified:false, is_stale:false, is_revoked:false, users_affected:150, users_type:"users", connected_at:new Date(Date.now()-86400000*30).toISOString(), last_active_at:new Date(Date.now()-86400000*1).toISOString(), permissions:[{id:"p8",scope:"channels:write",is_high_risk:false},{id:"p9",scope:"users:read",is_high_risk:false}], compliance:[] },
  { id:"a5", name:"MailChimp", platform:{name:"GitHub"}, connection_type:"OAuth", risk_score:61, severity:"high", verified:true, is_stale:false, is_revoked:false, users_affected:145, users_type:"users", connected_at:new Date(Date.now()-86400000*45).toISOString(), last_active_at:new Date(Date.now()-86400000*3).toISOString(), permissions:[{id:"p10",scope:"repo:read",is_high_risk:false},{id:"p11",scope:"emails:read",is_high_risk:true}], compliance:[{framework:{name:"SOC 2",short_code:"soc2"}},{framework:{name:"GDPR",short_code:"gdpr"}}] },
  { id:"a6", name:"Figma", platform:{name:"Slack"}, connection_type:"OAuth", risk_score:28, severity:"low", verified:true, is_stale:false, is_revoked:false, users_affected:89, users_type:"users", connected_at:new Date(Date.now()-86400000*15).toISOString(), last_active_at:new Date(Date.now()-86400000*0.5).toISOString(), permissions:[{id:"p12",scope:"files:read",is_high_risk:false}], compliance:[] },
  { id:"a7", name:"Notion", platform:{name:"GitHub"}, connection_type:"OAuth", risk_score:22, severity:"low", verified:true, is_stale:false, is_revoked:false, users_affected:67, users_type:"users", connected_at:new Date(Date.now()-86400000*20).toISOString(), last_active_at:new Date(Date.now()-86400000*1).toISOString(), permissions:[{id:"p13",scope:"repo:read",is_high_risk:false}], compliance:[] },
];
const DEMO_ALERTS = [
  { id:"al1", app_id:"a1", title:"Unverified app with admin access to Slack", severity:"critical", detail:"SlackBot Pro is unverified and holds admin-level permissions across all channels.", tags:["unverified","admin"], compliance_ref:"SOC 2 CC6.1", status:"open" },
  { id:"al2", app_id:"a2", title:"Stale GitHub token — no activity in 95 days", severity:"critical", detail:"DeployHelper has repo:write and admin:org access but has not been active in 95 days.", tags:["stale","write-access"], compliance_ref:"CC6.3", status:"open" },
  { id:"al3", app_id:"a3", title:"App accessing 18,000 contact records", severity:"high", detail:"DataSync360 has access to 18,000 contact records. A DPA may be required under GDPR Art. 28.", tags:["gdpr","pii"], compliance_ref:"GDPR Art. 28", status:"open" },
];
const DEMO_REVS = [
  { id:"r1", app_name:"OldTracker", platform:"GitHub", performed_by:"demo", performed_at:new Date(Date.now()-86400000*5).toISOString() },
  { id:"r2", app_name:"TestBot", platform:"Slack", performed_by:"demo", performed_at:new Date(Date.now()-86400000*12).toISOString() },
];

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const LANGS = {
  en: { dir:"ltr", dashboard:"Dashboard", inventory:"App Inventory", alerts:"Critical Alerts", permissions:"Permissions", revocations:"Revocation Log", addApp:"Add App", profile:"Profile", integrations:"Integrations", monitor:"Monitor", manage:"Manage", compliance:"Compliance", settings:"Settings", runScan:"Run Scan", exportPdf:"Export PDF", lastScan:"Last scan", minsAgo:"min ago", appsMonitored:"apps monitored", globalScore:"Global Security Score", connectedApps:"Connected Apps", complianceGaps:"Compliance Gaps", staleIntegrations:"Stale Integrations", criticalAlerts:"Critical Alerts", sensitiveAccess:"Sensitive Data Access", riskScore:"Risk Score", permissionsCol:"Permissions", users:"Users", actions:"Actions", revoke:"Revoke", review:"Review", dismiss:"Dismiss", revokeNow:"Revoke now", cancel:"Cancel", revokeTitle:"Revoke access?", revokeBody:"This will immediately disconnect {app} from {platform}. Cannot be undone.", revokedLabel:"Revoked", scanComplete:"Scan complete", criticalRisks:"critical risks found", noAlerts:"All alerts resolved — organization is clear!", noRevocations:"No revocations yet.", viewAll:"View all", platform:"Platform", connection:"Connection", verified:"Verified", lastActive:"Last active", connected:"Connected", activityLog:"Activity log", revokeAccess:"Revoke Access", accessRevoked:"Access revoked", showing:"Showing", of:"of", apps:"apps", sortedBy:"sorted by", search:"Search apps...", filterAll:"All", filterStale:"Stale", filterCritical:"Critical", filterHigh:"High", signIn:"Sign In", signOut:"Sign Out", createAccount:"Create Account", email:"Email address", password:"Password", fullName:"Full name", orgName:"Organization name", role:"Role", signingIn:"Signing in...", creatingAccount:"Creating account...", loginTitle:"Welcome back", loginSub:"Sign in to your security dashboard", registerTitle:"Create your account", registerSub:"Start securing your SaaS stack", controlsPassing:"Controls passing", appsAtRisk:"Apps at risk", risksResolved:"Risks resolved", openFindings:"Open findings", affectedApps:"Affected applications", noRisk:"No apps affecting", highRisk:"High-risk", activePerm:"Active", notGranted:"Not granted", language:"Language", noApps:"No apps yet. Connect a platform to start scanning.", itManager:"IT Manager", ciso:"CISO", auditor:"Auditor", loading:"Loading ScopeGuard...", connectPlatforms:"Connect Platforms", connectGithub:"Connect GitHub", connectSlack:"Connect Slack", connected:"Connected", scanning:"Scanning...", scanNow:"Scan Now", lastSynced:"Last synced", neverSynced:"Never synced", connectDesc:"Connect your platforms to automatically discover all third-party apps", profileTitle:"Profile Settings", editProfile:"Save Changes", saving:"Saving...", saved:"Saved!", displayName:"Display name", jobTitle:"Job title", emailNotif:"Email notifications", weeklyReport:"Weekly security report", criticalOnly:"Critical alerts only", appearance:"Appearance", darkMode:"Dark mode", compactView:"Compact view", dangerZone:"Danger zone", deleteAccount:"Delete account", appName:"App name", appPublisher:"Publisher", appConnType:"Connection type", appRiskScore:"Risk score", appUsersAff:"Users affected", appUsersType:"Users type", appVerified:"Publisher status", appStale:"Token status", appNotes:"Notes", addAppBtn:"Add Application", adding:"Adding...", appAdded:"Application added!" },
  he: { dir:"rtl", dashboard:"לוח בקרה", inventory:"מלאי אפליקציות", alerts:"התראות קריטיות", permissions:"הרשאות", revocations:"יומן ביטולים", addApp:"הוסף אפליקציה", profile:"פרופיל", integrations:"אינטגרציות", monitor:"ניטור", manage:"ניהול", compliance:"ציות", settings:"הגדרות", runScan:"הפעל סריקה", exportPdf:"ייצא PDF", lastScan:"סריקה אחרונה", minsAgo:"דק׳", appsMonitored:"אפליקציות", globalScore:"ציון אבטחה כולל", connectedApps:"אפליקציות מחוברות", complianceGaps:"פערי ציות", staleIntegrations:"אינטגרציות ישנות", criticalAlerts:"התראות קריטיות", sensitiveAccess:"גישה למידע רגיש", riskScore:"ציון סיכון", permissionsCol:"הרשאות", users:"משתמשים", actions:"פעולות", revoke:"בטל גישה", review:"סקירה", dismiss:"התעלם", revokeNow:"בטל עכשיו", cancel:"ביטול", revokeTitle:"לבטל גישה?", revokeBody:"פעולה זו תנתק את {app} מ-{platform}.", revokedLabel:"בוטל", scanComplete:"סריקה הושלמה", criticalRisks:"סיכונים קריטיים", noAlerts:"כל ההתראות טופלו!", noRevocations:"אין ביטולים עדיין.", viewAll:"הצג הכל", platform:"פלטפורמה", connection:"חיבור", verified:"מאומת", lastActive:"פעיל לאחרונה", connected:"חובר", activityLog:"יומן פעילות", revokeAccess:"בטל גישה", accessRevoked:"גישה בוטלה", showing:"מציג", of:"מתוך", apps:"אפליקציות", sortedBy:"ממוין לפי", search:"חיפוש...", filterAll:"הכל", filterStale:"ישן", filterCritical:"קריטי", filterHigh:"גבוה", signIn:"התחבר", signOut:"התנתק", createAccount:"צור חשבון", email:"אימייל", password:"סיסמה", fullName:"שם מלא", orgName:"שם ארגון", role:"תפקיד", signingIn:"מתחבר...", creatingAccount:"יוצר חשבון...", loginTitle:"ברוך השב", loginSub:"התחבר ללוח הבקרה", registerTitle:"צור חשבון", registerSub:"התחל לאבטח את ה-SaaS שלך", controlsPassing:"בקרות עוברות", appsAtRisk:"אפליקציות בסיכון", risksResolved:"סיכונים שטופלו", openFindings:"ממצאים פתוחים", affectedApps:"אפליקציות מושפעות", noRisk:"אין אפליקציות עבור", highRisk:"סיכון גבוה", activePerm:"פעיל", notGranted:"לא הוענקה", language:"שפה", noApps:"אין אפליקציות. חבר פלטפורמה כדי להתחיל.", itManager:"מנהל IT", ciso:"CISO", auditor:"מבקר", loading:"טוען...", connectPlatforms:"חבר פלטפורמות", connectGithub:"חבר GitHub", connectSlack:"חבר Slack", connected:"מחובר", scanning:"סורק...", scanNow:"סרוק עכשיו", lastSynced:"סונכרן לאחרונה", neverSynced:"לא סונכרן", connectDesc:"חבר את הפלטפורמות שלך לגלות אוטומטית את כל האפליקציות", profileTitle:"הגדרות פרופיל", editProfile:"שמור שינויים", saving:"שומר...", saved:"נשמר!", displayName:"שם תצוגה", jobTitle:"תפקיד", emailNotif:"התראות אימייל", weeklyReport:"דוח שבועי", criticalOnly:"התראות קריטיות בלבד", appearance:"מראה", darkMode:"מצב כהה", compactView:"תצוגה קומפקטית", dangerZone:"אזור מסוכן", deleteAccount:"מחק חשבון", appName:"שם האפליקציה", appPublisher:"מפרסם", appConnType:"סוג חיבור", appRiskScore:"ציון סיכון", appUsersAff:"משתמשים מושפעים", appUsersType:"סוג", appVerified:"סטטוס מפרסם", appStale:"סטטוס טוקן", appNotes:"הערות", addAppBtn:"הוסף אפליקציה", adding:"מוסיף...", appAdded:"האפליקציה נוספה!" },
  ru: { dir:"ltr", dashboard:"Панель", inventory:"Реестр", alerts:"Уведомления", permissions:"Разрешения", revocations:"Журнал", addApp:"Добавить", profile:"Профиль", integrations:"Интеграции", monitor:"Мониторинг", manage:"Управление", compliance:"Соответствие", settings:"Настройки", runScan:"Сканировать", exportPdf:"Экспорт", lastScan:"Скан", minsAgo:"мин", appsMonitored:"приложений", globalScore:"Балл безопасности", connectedApps:"Приложения", complianceGaps:"Нарушения", staleIntegrations:"Устаревшие", criticalAlerts:"Уведомления", sensitiveAccess:"Доступ к данным", riskScore:"Риск", permissionsCol:"Разрешения", users:"Пользователи", actions:"Действия", revoke:"Отозвать", review:"Обзор", dismiss:"Закрыть", revokeNow:"Отозвать", cancel:"Отмена", revokeTitle:"Отозвать доступ?", revokeBody:"Отключит {app} от {platform}.", revokedLabel:"Отозвано", scanComplete:"Скан завершён", criticalRisks:"критических рисков", noAlerts:"Все уведомления устранены!", noRevocations:"Нет отзывов.", viewAll:"Все", platform:"Платформа", connection:"Подключение", verified:"Проверено", lastActive:"Активность", connected:"Подключено", activityLog:"Журнал", revokeAccess:"Отозвать доступ", accessRevoked:"Доступ отозван", showing:"Показано", of:"из", apps:"приложений", sortedBy:"сортировка", search:"Поиск...", filterAll:"Все", filterStale:"Устаревшие", filterCritical:"Критические", filterHigh:"Высокий", signIn:"Войти", signOut:"Выйти", createAccount:"Регистрация", email:"Email", password:"Пароль", fullName:"Имя", orgName:"Организация", role:"Роль", signingIn:"Вход...", creatingAccount:"Создание...", loginTitle:"С возвращением", loginSub:"Войдите в панель", registerTitle:"Регистрация", registerSub:"Защитите ваш SaaS", controlsPassing:"Контроли", appsAtRisk:"В риске", risksResolved:"Устранено", openFindings:"Открытые", affectedApps:"Затронутые", noRisk:"Нет для", highRisk:"Высокий риск", activePerm:"Активно", notGranted:"Нет", language:"Язык", noApps:"Нет приложений. Подключите платформу.", itManager:"IT Manager", ciso:"CISO", auditor:"Аудитор", loading:"Загрузка...", connectPlatforms:"Подключить", connectGithub:"Подключить GitHub", connectSlack:"Подключить Slack", connected:"Подключено", scanning:"Сканирование...", scanNow:"Сканировать", lastSynced:"Синхронизировано", neverSynced:"Не синхронизировано", connectDesc:"Подключите платформы для автоматического обнаружения", profileTitle:"Настройки профиля", editProfile:"Сохранить", saving:"Сохранение...", saved:"Сохранено!", displayName:"Имя", jobTitle:"Должность", emailNotif:"Email уведомления", weeklyReport:"Еженедельный отчёт", criticalOnly:"Только критические", appearance:"Вид", darkMode:"Тёмный режим", compactView:"Компактный вид", dangerZone:"Опасная зона", deleteAccount:"Удалить аккаунт", appName:"Название", appPublisher:"Издатель", appConnType:"Тип", appRiskScore:"Риск", appUsersAff:"Пользователи", appUsersType:"Тип", appVerified:"Издатель", appStale:"Статус", appNotes:"Заметки", addAppBtn:"Добавить", adding:"Добавление...", appAdded:"Добавлено!" },
  es: { dir:"ltr", dashboard:"Panel", inventory:"Inventario", alerts:"Alertas", permissions:"Permisos", revocations:"Registro", addApp:"Agregar", profile:"Perfil", integrations:"Integraciones", monitor:"Monitoreo", manage:"Gestión", compliance:"Cumplimiento", settings:"Ajustes", runScan:"Escanear", exportPdf:"Exportar", lastScan:"Último escaneo", minsAgo:"min", appsMonitored:"apps", globalScore:"Puntuación global", connectedApps:"Apps conectadas", complianceGaps:"Brechas", staleIntegrations:"Obsoletas", criticalAlerts:"Alertas críticas", sensitiveAccess:"Datos sensibles", riskScore:"Riesgo", permissionsCol:"Permisos", users:"Usuarios", actions:"Acciones", revoke:"Revocar", review:"Revisar", dismiss:"Ignorar", revokeNow:"Revocar", cancel:"Cancelar", revokeTitle:"¿Revocar?", revokeBody:"Desconectará {app} de {platform}.", revokedLabel:"Revocado", scanComplete:"Escaneo listo", criticalRisks:"riesgos críticos", noAlerts:"¡Todo resuelto!", noRevocations:"Sin revocaciones.", viewAll:"Ver todo", platform:"Plataforma", connection:"Conexión", verified:"Verificado", lastActive:"Actividad", connected:"Conectado", activityLog:"Actividad", revokeAccess:"Revocar", accessRevoked:"Revocado", showing:"Mostrando", of:"de", apps:"apps", sortedBy:"orden", search:"Buscar...", filterAll:"Todo", filterStale:"Obsoleto", filterCritical:"Crítico", filterHigh:"Alto", signIn:"Entrar", signOut:"Salir", createAccount:"Registro", email:"Correo", password:"Contraseña", fullName:"Nombre", orgName:"Organización", role:"Rol", signingIn:"Entrando...", creatingAccount:"Creando...", loginTitle:"Bienvenido", loginSub:"Inicia sesión", registerTitle:"Registro", registerSub:"Protege tu SaaS", controlsPassing:"Controles", appsAtRisk:"En riesgo", risksResolved:"Resueltos", openFindings:"Abiertos", affectedApps:"Afectadas", noRisk:"Sin apps para", highRisk:"Alto riesgo", activePerm:"Activo", notGranted:"No", language:"Idioma", noApps:"Sin apps. Conecta una plataforma.", itManager:"IT Manager", ciso:"CISO", auditor:"Auditor", loading:"Cargando...", connectPlatforms:"Conectar", connectGithub:"Conectar GitHub", connectSlack:"Conectar Slack", connected:"Conectado", scanning:"Escaneando...", scanNow:"Escanear", lastSynced:"Sincronizado", neverSynced:"Sin sincronizar", connectDesc:"Conecta tus plataformas para descubrir apps automáticamente", profileTitle:"Perfil", editProfile:"Guardar", saving:"Guardando...", saved:"Guardado!", displayName:"Nombre", jobTitle:"Cargo", emailNotif:"Notificaciones", weeklyReport:"Informe semanal", criticalOnly:"Solo críticos", appearance:"Apariencia", darkMode:"Modo oscuro", compactView:"Vista compacta", dangerZone:"Zona peligrosa", deleteAccount:"Eliminar cuenta", appName:"Nombre", appPublisher:"Editor", appConnType:"Tipo", appRiskScore:"Riesgo", appUsersAff:"Usuarios", appUsersType:"Tipo", appVerified:"Editor", appStale:"Estado", appNotes:"Notas", addAppBtn:"Agregar", adding:"Agregando...", appAdded:"¡Agregado!" },
  fr: { dir:"ltr", dashboard:"Tableau", inventory:"Inventaire", alerts:"Alertes", permissions:"Permissions", revocations:"Journal", addApp:"Ajouter", profile:"Profil", integrations:"Intégrations", monitor:"Surveillance", manage:"Gestion", compliance:"Conformité", settings:"Paramètres", runScan:"Scanner", exportPdf:"Exporter", lastScan:"Dernier scan", minsAgo:"min", appsMonitored:"apps", globalScore:"Score global", connectedApps:"Apps connectées", complianceGaps:"Lacunes", staleIntegrations:"Obsolètes", criticalAlerts:"Alertes critiques", sensitiveAccess:"Données sensibles", riskScore:"Score", permissionsCol:"Permissions", users:"Utilisateurs", actions:"Actions", revoke:"Révoquer", review:"Réviser", dismiss:"Ignorer", revokeNow:"Révoquer", cancel:"Annuler", revokeTitle:"Révoquer ?", revokeBody:"Déconnectera {app} de {platform}.", revokedLabel:"Révoqué", scanComplete:"Scan terminé", criticalRisks:"risques critiques", noAlerts:"Tout résolu !", noRevocations:"Aucune révocation.", viewAll:"Tout voir", platform:"Plateforme", connection:"Connexion", verified:"Vérifié", lastActive:"Activité", connected:"Connecté", activityLog:"Journal", revokeAccess:"Révoquer", accessRevoked:"Révoqué", showing:"Affichage", of:"sur", apps:"apps", sortedBy:"tri", search:"Rechercher...", filterAll:"Tout", filterStale:"Obsolète", filterCritical:"Critique", filterHigh:"Élevé", signIn:"Connexion", signOut:"Déconnexion", createAccount:"S'inscrire", email:"E-mail", password:"Mot de passe", fullName:"Nom", orgName:"Organisation", role:"Rôle", signingIn:"Connexion...", creatingAccount:"Création...", loginTitle:"Bon retour", loginSub:"Connectez-vous", registerTitle:"Inscription", registerSub:"Sécurisez votre SaaS", controlsPassing:"Contrôles", appsAtRisk:"À risque", risksResolved:"Résolus", openFindings:"Ouverts", affectedApps:"Affectées", noRisk:"Aucune app pour", highRisk:"Haut risque", activePerm:"Actif", notGranted:"Non", language:"Langue", noApps:"Pas d'apps. Connectez une plateforme.", itManager:"IT Manager", ciso:"CISO", auditor:"Auditeur", loading:"Chargement...", connectPlatforms:"Connecter", connectGithub:"Connecter GitHub", connectSlack:"Connecter Slack", connected:"Connecté", scanning:"Scan...", scanNow:"Scanner", lastSynced:"Synchronisé", neverSynced:"Jamais synchronisé", connectDesc:"Connectez vos plateformes pour découvrir toutes les apps", profileTitle:"Profil", editProfile:"Sauvegarder", saving:"Sauvegarde...", saved:"Sauvegardé!", displayName:"Nom", jobTitle:"Poste", emailNotif:"Notifications email", weeklyReport:"Rapport hebdo", criticalOnly:"Critiques seulement", appearance:"Apparence", darkMode:"Mode sombre", compactView:"Vue compacte", dangerZone:"Zone dangereuse", deleteAccount:"Supprimer le compte", appName:"Nom", appPublisher:"Éditeur", appConnType:"Type", appRiskScore:"Score", appUsersAff:"Utilisateurs", appUsersType:"Type", appVerified:"Éditeur", appStale:"Statut", appNotes:"Notes", addAppBtn:"Ajouter", adding:"Ajout...", appAdded:"Ajouté!" },
};

const LANG_NAMES = { en:"English", he:"עברית", ru:"Русский", es:"Español", fr:"Français" };
const PC = { Slack:"#4A154B", GitHub:"#24292e", "Google Workspace":"#0f9d58", Salesforce:"#00A1E0" };
const SEV_CLS = { critical:"sev-c", high:"sev-h", medium:"sev-m", low:"sev-l" };
const SEV_TXT = { critical:"Critical", high:"High", medium:"Medium", low:"Low" };

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{height:100%;width:100%;overflow:hidden}
body{height:100%;width:100%;overflow:hidden;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s}
#root{height:100%;width:100%;display:flex}
button,input,select,textarea{font-family:inherit}
button{cursor:pointer;outline:none}
input,select,textarea{outline:none}

/* ANIMATIONS */
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.3)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0)}}
@keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

.fade-in{animation:fadeIn .35s ease both}
.slide-in{animation:slideIn .3s ease both}
.scale-in{animation:scaleIn .25s ease both}
.pulse{animation:pulse 2.2s ease-in-out infinite}

/* DARK MODE VARIABLES */
:root{
  --bg:#f1f5f9;--bg3:#f8fafc;
  --border:#e2e8f0;--border2:#f1f5f9;
  --text:#0f172a;--text2:#475569;--text3:#94a3b8;
  --card:#fff;--topbar:#fff;
  --input-bg:#f8fafc;--input-border:#e2e8f0;
  --th-bg:#f8fafc;--tr-hover:#f8fafc;--shadow:rgba(0,0,0,.06);
}
html.dark{
  --bg:#060d1a;--bg3:#1a2234;
  --border:rgba(255,255,255,.08);--border2:rgba(255,255,255,.04);
  --text:#f1f5f9;--text2:#94a3b8;--text3:#475569;
  --card:#111827;--topbar:#0d1526;
  --input-bg:#1a2234;--input-border:rgba(255,255,255,.1);
  --th-bg:#0a0f1e;--tr-hover:#1a2234;--shadow:rgba(0,0,0,.3);
}

/* LAYOUT — TRUE FULL SCREEN */
.shell{display:flex;width:100vw;height:100vh;overflow:hidden;background:var(--bg);position:fixed;top:0;left:0}
.sidebar{width:230px;min-width:230px;max-width:230px;height:100%;background:linear-gradient(180deg,#060d1a 0%,#0a1628 100%);display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;border-right:1px solid rgba(255,255,255,.05)}
.sb-inner{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;min-height:0}
.sb-inner::-webkit-scrollbar{width:3px}
.sb-inner::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
.content{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.topbar{width:100%;background:var(--topbar);border-bottom:1px solid var(--border);padding:0 28px;height:66px;min-height:66px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 3px var(--shadow);transition:background .25s;overflow:hidden}
.scroll-area{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:24px 28px 80px;display:flex;flex-direction:column;gap:20px}
.scroll-area::-webkit-scrollbar{width:5px}
.scroll-area::-webkit-scrollbar-track{background:transparent}
.scroll-area::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.scroll-area::-webkit-scrollbar-thumb:hover{background:var(--text3)}
/* Force all direct children to not clip */
.scroll-area > *{flex-shrink:0}

/* BRAND — animated shimmer name */
@keyframes shimmerBrand{0%{background-position:-200% center}100%{background-position:200% center}}
.sb-brand{padding:20px 16px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0}
.sb-logo{width:42px;height:42px;display:flex;align-items:center;justify-content:center;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(167,139,250,.3))}
.sb-logo svg{width:38px;height:38px}
.sb-bname{font-size:17px;font-weight:900;letter-spacing:-.6px;background:linear-gradient(90deg,#fff 0%,#10b981 50%,#fff 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmerBrand 4s linear infinite}
.sb-tagline{font-size:9px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:.12em;margin-top:1px}

/* SIDEBAR NAV */
.sb-nav{padding:8px 10px 0}
.sb-sec{font-size:9px;font-weight:700;color:rgba(255,255,255,.15);text-transform:uppercase;letter-spacing:.12em;padding:12px 8px 4px}
.sb-link{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;font-size:12px;font-weight:500;color:rgba(255,255,255,.42);cursor:pointer;margin-bottom:1px;transition:all .15s;user-select:none;white-space:nowrap}
.sb-link:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.8);padding-left:13px}
.sb-link.active{background:linear-gradient(135deg,rgba(16,185,129,.18),rgba(5,150,105,.1));color:#10b981;font-weight:600;border:1px solid rgba(16,185,129,.15);padding-left:10px}
.sb-icon{width:15px;height:15px;flex-shrink:0;opacity:.5}
.sb-link.active .sb-icon{opacity:1}
.sb-badge{margin-left:auto;background:#ef4444;color:#fff;border-radius:10px;font-size:9px;font-weight:700;padding:1px 6px;line-height:1.5}

/* DARK MODE TOGGLE in sidebar */
.sb-dm-row{display:flex;align-items:center;justify-content:space-between;padding:8px 18px;cursor:pointer;transition:.15s}
.sb-dm-row:hover{background:rgba(255,255,255,.04)}
.sb-dm-lbl{font-size:10px;font-weight:600;color:rgba(255,255,255,.35);display:flex;align-items:center;gap:6px}
.dm-track{width:32px;height:18px;background:rgba(255,255,255,.12);border-radius:9px;position:relative;transition:.2s;flex-shrink:0}
.dm-track.on{background:#10b981}
.dm-thumb{width:12px;height:12px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.dm-track.on .dm-thumb{left:17px}

/* LANG */
.sb-lang{padding:8px 14px 10px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}
.sb-lang-lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,.18);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.lang-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px}
.lang-btn{font-size:10px;font-weight:600;padding:5px 4px;border-radius:6px;border:1px solid rgba(255,255,255,.06);background:transparent;color:rgba(255,255,255,.3);cursor:pointer;transition:.15s;text-align:center}
.lang-btn:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.65)}
.lang-btn.active{background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;color:#fff}

/* FOOTER */
.sb-footer{padding:12px 14px;border-top:1px solid rgba(255,255,255,.05);flex-shrink:0}
.sb-user{display:flex;align-items:center;gap:9px}
.sb-av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;cursor:pointer;transition:.15s}
.sb-av:hover{transform:scale(1.08)}
.sb-uname{font-size:11px;font-weight:700;color:rgba(255,255,255,.75);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90px;cursor:pointer}
.sb-uname:hover{color:#10b981}
.sb-urole{font-size:9px;color:rgba(255,255,255,.25);text-transform:capitalize}
.sb-out{margin-left:auto;font-size:9px;padding:3px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.3);cursor:pointer;transition:.15s;flex-shrink:0}
.sb-out:hover{color:rgba(255,255,255,.65);background:rgba(255,255,255,.06)}

/* TOPBAR */
.tb-l{display:flex;flex-direction:column;gap:2px}
.tb-title{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-.4px}
.tb-sub{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px}
.tb-pulse{width:7px;height:7px;border-radius:50%;background:#10b981;flex-shrink:0;animation:pulse 2.2s ease-in-out infinite}
.tb-r{display:flex;gap:9px;align-items:center}
.btn-sec{font-size:12px;font-weight:600;padding:8px 16px;border-radius:9px;border:1px solid var(--border);background:var(--card);color:var(--text2);transition:.15s;display:flex;align-items:center;gap:6px}
.btn-sec:hover{background:var(--bg3)}
.btn-pri{font-size:12px;font-weight:700;padding:8px 20px;border-radius:9px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;transition:.15s}
.btn-pri:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(16,185,129,.35)}
.btn-pri:disabled{opacity:.6;cursor:not-allowed;transform:none}

/* KPI */
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;cursor:pointer;transition:all .2s;animation:fadeIn .4s ease both}
.kpi:hover{border-color:#10b981;box-shadow:0 4px 20px rgba(16,185,129,.1);transform:translateY(-2px)}
.kpi:nth-child(1){animation-delay:.05s}
.kpi:nth-child(2){animation-delay:.1s}
.kpi:nth-child(3){animation-delay:.15s}
.kpi:nth-child(4){animation-delay:.2s}
.kpi-lbl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.kpi-val{font-size:32px;font-weight:900;color:var(--text);line-height:1;animation:countUp .5s ease both}
.kpi-sub{font-size:11px;color:var(--text3);margin-top:5px}
.ring-wrap{display:flex;align-items:center;gap:12px}
.ring{position:relative;width:56px;height:56px;flex-shrink:0}
.ring svg{width:56px;height:56px}
.ring-in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.ring-grade{font-size:14px;font-weight:900;color:#0f172a;line-height:1}
.ring-lbl{font-size:8px;color:#94a3b8;margin-top:1px}
.dbar-list{margin-top:10px;display:flex;flex-direction:column;gap:5px}
.dbar{display:flex;align-items:center;gap:7px}
.dbar-lbl{font-size:10px;font-weight:700;min-width:46px}
.dbar-track{flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden}
.dbar-fill{height:100%;border-radius:3px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.dbar-n{font-size:11px;font-weight:800;min-width:20px;text-align:right}
.comp-chips{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}

/* CARDS */
.mid-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;animation:fadeIn .4s ease both}
.card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.card-title{font-size:13px;font-weight:700;color:var(--text)}
.card-link{font-size:11px;font-weight:700;color:#10b981;cursor:pointer;transition:.15s}
.card-link:hover{color:#059669}

/* ALERTS */
.al-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;animation:slideIn .3s ease both}
.al-item:last-child{border-bottom:none;padding-bottom:0}
.al-ico{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.al-body{flex:1;min-width:0}
.al-ttl{font-size:11px;font-weight:700;color:#0f172a;line-height:1.4}
.al-meta{font-size:10px;color:#94a3b8;margin-top:3px}
.al-acts{display:flex;gap:5px;margin-top:6px}
.sev{font-size:9px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0;line-height:1.6}
.sev-c{background:#fee2e2;color:#991b1b}
.sev-h{background:#fef3c7;color:#92400e}
.sev-m{background:#dbeafe;color:#1e40af}
.sev-l{background:#d1fae5;color:#065f46}

/* PERM BARS */
.pbar{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.pbar-lbl{font-size:11px;color:#64748b;min-width:145px}
.pbar-track{flex:1;height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden}
.pbar-fill{height:100%;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.pbar-n{font-size:11px;font-weight:700;color:#334155;min-width:22px;text-align:right}

/* TABLE */
.tcard{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;animation:fadeIn .5s ease both}
.tbar{padding:14px 18px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tbar-title{font-size:13px;font-weight:700;color:var(--text)}
.filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.chip{font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;user-select:none;transition:.15s;white-space:nowrap}
.chip:hover{border-color:#cbd5e1}
.chip-g{background:#d1fae5;border-color:#6ee7b7;color:#065f46}
.chip-r{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.chip-a{background:#fef3c7;border-color:#fcd34d;color:#92400e}
.srch{font-size:12px;padding:7px 12px;border-radius:9px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text);width:170px;outline:none;transition:.15s}
.srch:focus{border-color:#10b981;background:var(--card);box-shadow:0 0 0 3px rgba(16,185,129,.08)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);padding:10px 16px;text-align:left;border-bottom:1px solid var(--border2);background:var(--th-bg);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
thead th:hover{color:var(--text2)}
tbody td{font-size:11px;padding:11px 16px;border-bottom:1px solid var(--border2);vertical-align:middle;overflow:hidden;color:var(--text)}
tbody tr:last-child td{border-bottom:none}
tbody tr{transition:background .1s}
tbody tr:hover td{background:var(--tr-hover)}
tbody tr.rev td{opacity:.35}
.app-cell{display:flex;align-items:center;gap:9px}
.app-ic{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0}
.app-nm{font-size:11px;font-weight:700;color:var(--text)}
.app-pl{font-size:9px;color:var(--text3);margin-top:1px}
.unv{font-size:8px;font-weight:700;color:#92400e;background:#fef3c7;border-radius:3px;padding:1px 4px;margin-left:4px}
.stale-dot{width:7px;height:7px;border-radius:50%;background:#f59e0b;border:1.5px solid var(--card);flex-shrink:0}
.rbar-wrap{display:flex;align-items:center;gap:6px}
.rbar{width:40px;height:4px;background:var(--border);border-radius:2px;overflow:hidden;flex-shrink:0}
.rbar-fill{height:100%;border-radius:2px}
.ptags{display:flex;flex-wrap:wrap;gap:3px}
.ptag{font-size:8px;font-weight:600;padding:2px 5px;border-radius:4px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);white-space:nowrap}
.ptag-r{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.cf-wrap{display:flex;gap:3px;flex-wrap:wrap}
.cf{font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#92400e}
.cf-ok{background:#d1fae5;color:#065f46}
.act-wrap{display:flex;gap:4px}
.btn-rev{font-size:10px;font-weight:700;padding:4px 9px;border-radius:7px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;cursor:pointer;transition:.15s}
.btn-rev:hover{background:#fecaca;transform:translateY(-1px)}
.btn-rvw{font-size:10px;font-weight:600;padding:4px 9px;border-radius:7px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);cursor:pointer;transition:.15s}
.btn-rvw:hover{background:var(--bg)}
.tfoot{padding:10px 18px;font-size:10px;color:var(--text3);border-top:1px solid var(--border2)}

/* ALERTS PAGE */
.alerts-list{display:flex;flex-direction:column;gap:12px}
.alert-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;border-left:4px solid var(--border);animation:fadeIn .35s ease both;transition:box-shadow .2s}
.alert-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}
.alert-card.crit{border-left-color:#ef4444}
.alert-card.high{border-left-color:#f59e0b}
.alert-card.med{border-left-color:#3b82f6}
.ac-row{display:flex;gap:14px;align-items:flex-start}
.ac-ico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ac-body{flex:1}
.ac-hd{display:flex;align-items:center;gap:9px;margin-bottom:5px}
.ac-name{font-size:13px;font-weight:800;color:#0f172a}
.ac-detail{font-size:11px;color:#64748b;line-height:1.6;margin-bottom:10px}
.ac-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:11px}
.ac-tag{font-size:9px;font-weight:600;padding:2px 7px;border-radius:4px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0}
.ac-tag-c{background:#fef3c7;color:#92400e;border-color:#fcd34d}
.ac-acts{display:flex;gap:7px}

/* COMPLIANCE */
.comp-hero{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;animation:fadeIn .4s ease both}
.comp-stat{text-align:center}
.comp-n{font-size:40px;font-weight:900;line-height:1}
.comp-l{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-top:5px}
.comp-2col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ctrl-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;animation:fadeIn .5s ease both}
.ctrl-hd{padding:14px 18px;border-bottom:1px solid var(--border2);background:var(--th-bg);display:flex;align-items:center;justify-content:space-between}
.ctrl-hd-title{font-size:12px;font-weight:700;color:var(--text)}
.ctrl-item{display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--border2);font-size:11px;transition:background .1s;color:var(--text)}
.ctrl-item:last-child{border-bottom:none}
.ctrl-item:hover{background:var(--tr-hover)}
.cs{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0}
.cs-p{background:#d1fae5;color:#065f46}
.cs-w{background:#fef3c7;color:#92400e}
.cs-f{background:#fee2e2;color:#991b1b}

/* PERM MATRIX */
.pm-wrap{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;animation:fadeIn .4s ease both}
.pm-row{display:grid;border-bottom:1px solid var(--border2);transition:background .1s}
.pm-row:last-child{border-bottom:none}
.pm-row:hover .pm-cell{background:var(--tr-hover)}
.pm-head{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);padding:9px 8px;background:var(--th-bg);text-align:center}
.pm-app{padding:10px 16px;font-size:11px;font-weight:700;color:var(--text2);display:flex;align-items:center;gap:8px;border-right:1px solid var(--border2);overflow:hidden}
.pm-cell{padding:10px 8px;text-align:center;border-right:1px solid #f1f5f9;cursor:pointer}
.pm-cell:last-child{border-right:none}
.pm-dot{width:12px;height:12px;border-radius:50%;display:inline-block;transition:transform .15s}
.pm-row:hover .pm-dot{transform:scale(1.2)}
.perm-leg{display:flex;gap:14px;font-size:10px;color:#64748b;align-items:center;flex-wrap:wrap}
.leg-dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle}

/* REVOCATIONS */
.rev-list{display:flex;flex-direction:column;gap:10px}
.rev-item{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;animation:slideIn .3s ease both}
.rev-ic{width:34px;height:34px;border-radius:9px;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}

/* INTEGRATIONS PAGE */
.int-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.int-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;animation:scaleIn .3s ease both;transition:all .2s}
.int-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-2px)}
.int-card.connected{border-color:#10b981}
.int-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.int-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.int-name{font-size:14px;font-weight:800;color:var(--text)}
.int-type{font-size:10px;color:var(--text3);margin-top:1px}
.int-status{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700}
.int-status.on{color:#10b981}
.int-status.off{color:var(--text3)}
.int-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.int-dot.on{background:#10b981;animation:pulse 2s ease-in-out infinite}
.int-dot.off{background:var(--border)}
.int-desc{font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:14px}
.int-meta{font-size:10px;color:var(--text3);margin-bottom:14px}
.int-btn{width:100%;font-size:12px;font-weight:700;padding:10px;border-radius:10px;border:none;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;gap:7px}
.int-btn.connect{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff}
.int-btn.connect:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.2)}
.int-btn.scan{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
.int-btn.scan:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,.3)}
.int-btn.scanning{background:#f1f5f9;color:#64748b;cursor:not-allowed}
.int-apps-found{font-size:11px;font-weight:700;color:#10b981;text-align:center;margin-top:10px}

/* PROFILE PAGE */
.profile-grid{display:grid;grid-template-columns:1fr 2fr;gap:20px}
.profile-sidebar-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;text-align:center;animation:fadeIn .4s ease both}
.profile-avatar-lg{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:#fff;margin:0 auto 14px;cursor:pointer;transition:.2s;position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(16,185,129,.25)}
.profile-avatar-lg img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%}
.profile-avatar-lg:hover{transform:scale(1.04)}
.profile-avatar-lg:hover .avatar-overlay{opacity:1}
.avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:.2s;border-radius:50%;gap:3px;z-index:3}
.avatar-overlay-icon{font-size:20px}
.avatar-overlay-txt{font-size:9px;font-weight:700;color:#fff;letter-spacing:.05em;text-transform:uppercase}
.avatar-upload-input{display:none}
.avatar-edit{position:absolute;bottom:3px;right:3px;width:22px;height:22px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;border:2px solid var(--card);z-index:4}
.profile-name{font-size:16px;font-weight:800;color:var(--text)}
.profile-role{font-size:12px;color:var(--text3);margin-top:3px}
.profile-org{font-size:11px;font-weight:600;color:#10b981;margin-top:6px}
.profile-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
.pstat{background:var(--bg3);border-radius:9px;padding:10px;text-align:center}
.pstat-n{font-size:18px;font-weight:900;color:var(--text)}
.pstat-l{font-size:9px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.profile-main-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;animation:fadeIn .4s ease both;display:flex;flex-direction:column;gap:20px}
.section-title{font-size:13px;font-weight:800;color:#0f172a;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.f-group{display:flex;flex-direction:column;gap:5px}
.f-group.full{grid-column:1/-1}
.f-lbl{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em}
.f-inp{font-size:13px;padding:10px 13px;border-radius:9px;border:1.5px solid var(--input-border);color:var(--text);outline:none;transition:.15s;background:var(--input-bg);width:100%}
.f-inp:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.08)}
.f-sel{font-size:13px;padding:10px 13px;border-radius:9px;border:1.5px solid var(--input-border);color:var(--text);outline:none;transition:.15s;background:var(--input-bg);width:100%;cursor:pointer}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border2)}
.toggle-row:last-child{border-bottom:none}
.toggle-info{font-size:12px;font-weight:600;color:var(--text)}
.toggle-sub{font-size:10px;color:var(--text3);margin-top:1px}
.toggle-switch{width:38px;height:22px;background:var(--border);border-radius:11px;cursor:pointer;transition:.2s;position:relative;flex-shrink:0}
.toggle-switch.on{background:#10b981}
.toggle-thumb{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:3px;left:3px;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.toggle-switch.on .toggle-thumb{left:19px}
.danger-zone{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px}
.danger-title{font-size:12px;font-weight:700;color:#ef4444;margin-bottom:4px}
.danger-sub{font-size:11px;color:#f87171;margin-bottom:12px}
.btn-danger{font-size:12px;font-weight:700;padding:8px 18px;border-radius:8px;background:transparent;border:1.5px solid rgba(239,68,68,.4);color:#ef4444;cursor:pointer;transition:.15s}
.btn-danger:hover{background:rgba(239,68,68,.08)}

/* GUIDE PAGE */
.guide-hero{background:linear-gradient(135deg,#060d1a 0%,#0a2a1a 100%);border-radius:16px;padding:32px;position:relative;overflow:hidden}
.guide-hero::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(16,185,129,.15),transparent 70%);pointer-events:none}
.guide-hero-title{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:8px}
.guide-hero-sub{font-size:13px;color:rgba(255,255,255,.45);line-height:1.6;max-width:560px}
.guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.guide-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;transition:all .2s;animation:fadeIn .4s ease both}
.guide-card:hover{border-color:#10b981;box-shadow:0 4px 20px rgba(16,185,129,.08);transform:translateY(-2px)}
.guide-card-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.guide-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.guide-card-title{font-size:14px;font-weight:800;color:var(--text)}
.guide-card-sub{font-size:11px;color:var(--text3);margin-top:2px}
.guide-desc{font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:12px}
.guide-items{display:flex;flex-direction:column;gap:7px}
.guide-item{display:flex;align-items:flex-start;gap:9px;font-size:11px;color:var(--text2);line-height:1.5}
.guide-bullet{width:18px;height:18px;border-radius:50%;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#10b981;flex-shrink:0;margin-top:1px}
.guide-tip{background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:9px;padding:10px 14px;font-size:11px;color:var(--text2);margin-top:12px;line-height:1.6}
.guide-tip strong{color:#10b981;font-weight:700}
.guide-full{grid-column:1/-1}
.guide-risk-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.risk-pill{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700}
.risk-pill.c{background:#fee2e2;color:#991b1b}
.risk-pill.h{background:#fef3c7;color:#92400e}
.risk-pill.m{background:#dbeafe;color:#1e40af}
.risk-pill.l{background:#d1fae5;color:#065f46}

/* ADD APP */
.add-app-wrap{max-width:700px}
.add-app-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;animation:scaleIn .3s ease both}
.add-app-hd{padding:22px 26px;background:linear-gradient(135deg,#0a0f1e 0%,#064e3b 100%);display:flex;align-items:center;gap:14px}
.add-app-hico{width:48px;height:48px;background:rgba(16,185,129,.2);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;color:#10b981;font-weight:900}
.add-app-htitle{font-size:17px;font-weight:800;color:#fff}
.add-app-hsub{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px}
.add-app-body{padding:24px}
.add-app-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.aa-field{display:flex;flex-direction:column;gap:6px}
.aa-field.full{grid-column:1/-1}
.aa-label{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em}
.aa-input{font-size:13px;padding:10px 13px;border-radius:9px;border:1.5px solid #e2e8f0;color:#0f172a;outline:none;transition:.15s;background:#fff;width:100%}
.aa-input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.08)}
.aa-select{font-size:13px;padding:10px 13px;border-radius:9px;border:1.5px solid #e2e8f0;color:#0f172a;outline:none;transition:.15s;background:#fff;width:100%;cursor:pointer}
.aa-range{width:100%;accent-color:#10b981;cursor:pointer}
.risk-prev{display:flex;align-items:center;gap:10px;margin-top:8px}
.risk-prev-bar{flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden}
.risk-prev-fill{height:100%;border-radius:4px;transition:width .3s,background .3s}
.risk-prev-val{font-size:16px;font-weight:900;min-width:32px}
.aa-toggle{display:flex;align-items:center;gap:10px;padding:11px 13px;background:#f8fafc;border-radius:9px;border:1.5px solid #e2e8f0;cursor:pointer;transition:.15s;user-select:none}
.aa-toggle:hover{border-color:#cbd5e1}
.aa-toggle.on-g{background:#d1fae5;border-color:#6ee7b7}
.aa-toggle.on-a{background:#fef3c7;border-color:#fcd34d}
.aa-cb{width:18px;height:18px;border-radius:5px;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.15s;background:#fff;font-size:11px;font-weight:800}
.aa-cb.on-g{background:#10b981;border-color:#10b981;color:#fff}
.aa-cb.on-a{background:#f59e0b;border-color:#f59e0b;color:#fff}
.aa-divider{border:none;border-top:1px solid #f1f5f9;margin:20px 0}
.add-app-footer{padding:16px 26px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;align-items:center;justify-content:space-between}
.aa-hint{font-size:11px;color:#94a3b8}
.aa-submit{font-size:13px;font-weight:700;padding:10px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;cursor:pointer;transition:.15s}
.aa-submit:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,.3)}
.aa-submit:disabled{opacity:.6;cursor:not-allowed;transform:none}
.scope-row{display:flex;gap:8px;align-items:center}
.scope-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;min-height:34px;padding:8px;background:#f8fafc;border-radius:9px;border:1px solid #f1f5f9}
.stag{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;display:flex;align-items:center;gap:5px}
.stag-r{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.stag-x{cursor:pointer;font-size:14px;line-height:1;opacity:.5}
.stag-x:hover{opacity:1}
.success-banner{background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;font-size:13px;font-weight:700;color:#065f46;margin-bottom:16px;animation:scaleIn .3s ease both}
.success-ico{width:30px;height:30px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;color:#fff}

/* DETAIL PANEL */
.dp{position:fixed;top:0;right:0;bottom:0;width:295px;background:var(--card);border-left:1px solid var(--border);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);z-index:30;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(0,0,0,.08)}
.dp.open{transform:translateX(0)}
.dp-hd{padding:20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#0a0f1e,#0f2d20)}
.dp-title{font-size:14px;font-weight:800;color:#fff}
.dp-cls{background:rgba(255,255,255,.1);border:none;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;color:rgba(255,255,255,.6);cursor:pointer;transition:.15s}
.dp-cls:hover{background:rgba(255,255,255,.2);color:#fff}
.dp-body{padding:16px 18px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.dp-row{display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;padding:5px 0;border-bottom:1px solid #f8fafc}
.dp-lbl{color:#94a3b8;font-weight:600}
.dp-val{font-weight:700;color:#334155;text-align:right;max-width:160px;font-size:10px}
.dp-sec{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.dp-log{border-left:2px solid #e2e8f0;padding-left:10px;display:flex;flex-direction:column;gap:6px}
.dp-li{font-size:10px;color:#64748b;line-height:1.4}
.dp-li.r{color:#991b1b;font-weight:600}
.dp-li.a{color:#92400e;font-weight:600}
.dp-li.g{color:#065f46;font-weight:600}

/* MODAL */
.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:50;backdrop-filter:blur(4px)}
.modal-box{background:var(--card);border-radius:20px;padding:28px;max-width:380px;width:90%;box-shadow:0 24px 80px rgba(0,0,0,.2);animation:scaleIn .2s ease both}
.modal-title{font-size:18px;font-weight:800;color:var(--text);margin-bottom:8px}
.modal-body{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:22px}
.modal-btns{display:flex;gap:10px;justify-content:flex-end}
.mbtn-c{font-size:13px;font-weight:600;padding:9px 20px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;transition:.15s}
.mbtn-c:hover{background:#f8fafc}
.mbtn-r{font-size:13px;font-weight:700;padding:9px 20px;border-radius:10px;border:1px solid #fca5a5;background:#fee2e2;color:#991b1b;cursor:pointer;transition:.15s}
.mbtn-r:hover{background:#fecaca}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;background:#0a0f1e;color:#fff;font-size:13px;font-weight:600;padding:13px 22px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.25);z-index:60;opacity:0;transform:translateY(10px);transition:all .25s;pointer-events:none;display:flex;align-items:center;gap:8px}
.toast.show{opacity:1;transform:translateY(0)}
.toast-icon{width:20px;height:20px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}

/* AUTH */
.auth-wrap{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0f1e 0%,#064e3b 55%,#0a0f1e 100%);padding:24px;position:relative;overflow-y:auto;overflow-x:hidden}
.auth-wrap::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 50%,rgba(16,185,129,.08) 0%,transparent 60%),radial-gradient(circle at 70% 50%,rgba(16,185,129,.05) 0%,transparent 60%);pointer-events:none}
.auth-card{background:#0d1626;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:42px;width:100%;max-width:480px;box-shadow:0 32px 80px rgba(0,0,0,.5);animation:scaleIn .4s ease both;position:relative}
.auth-logo{display:flex;align-items:center;gap:14px;margin-bottom:28px;justify-content:center}
.auth-sh{width:50px;height:50px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;display:flex;align-items:center;justify-content:center;animation:glow 3s ease-in-out infinite}
.auth-sh svg{width:28px;height:28px}
.auth-bname{font-size:26px;font-weight:900;color:#fff;letter-spacing:-.7px}
.auth-btag{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-top:1px}
.auth-tagline{font-size:13px;color:rgba(255,255,255,.5);text-align:center;margin-bottom:20px}
.auth-tabs{display:flex;background:rgba(255,255,255,.06);border-radius:12px;padding:4px;margin-bottom:24px;border:1px solid rgba(255,255,255,.08)}
.auth-tab{flex:1;font-size:13px;font-weight:700;padding:10px;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.4);cursor:pointer;transition:.15s}
.auth-tab.active{background:rgba(255,255,255,.1);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.auth-title{font-size:24px;font-weight:900;color:#fff;text-align:center;margin-bottom:4px;letter-spacing:-.5px}
.auth-sub{font-size:13px;color:rgba(255,255,255,.45);text-align:center;margin-bottom:28px}
.auth-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.auth-err{font-size:12px;font-weight:600;color:#fca5a5;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:9px;padding:10px 14px;margin-top:14px;animation:slideIn .2s ease both}
.sub-btn{width:100%;font-size:14px;font-weight:800;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;cursor:pointer;margin-top:4px;transition:.15s;letter-spacing:.01em}
.sub-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,.4)}
.sub-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.auth-langs{display:flex;justify-content:center;gap:6px;margin-top:20px;flex-wrap:wrap}
.auth-lang-btn{font-size:11px;font-weight:600;padding:4px 11px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.4);cursor:pointer;transition:.15s}
.auth-lang-btn:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.7)}
.auth-lang-btn.active{background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;color:#fff}
.auth-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:rgba(255,255,255,.3);font-size:12px}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}
.btn-google{width:100%;font-size:14px;font-weight:600;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;gap:10px}
.btn-google:hover{border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.1);transform:translateY(-1px)}

/* AUTH INPUTS — dark theme */
.auth-card .f-lbl{color:rgba(255,255,255,.5);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.auth-card .f-inp{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);color:#fff;border-radius:9px;padding:12px 14px;font-size:14px;width:100%;outline:none;transition:.15s}
.auth-card .f-inp:focus{border-color:#10b981;background:rgba(255,255,255,.09);box-shadow:0 0 0 3px rgba(16,185,129,.12)}
.auth-card .f-inp::placeholder{color:rgba(255,255,255,.25)}
.auth-card .f-sel{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);color:#fff;border-radius:9px;padding:12px 14px;font-size:14px;width:100%;outline:none;transition:.15s;cursor:pointer}
.auth-card .f-sel option{background:#0d1626;color:#fff}
.loading-pg{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#64748b;font-size:14px;font-weight:600;background:linear-gradient(135deg,#0a0f1e,#064e3b)}
.loading-logo{width:56px;height:56px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;display:flex;align-items:center;justify-content:center;animation:glow 2s ease-in-out infinite}
.loading-logo svg{width:32px;height:32px}
.loading-text{color:rgba(255,255,255,.5);font-size:13px}
.spinner{width:24px;height:24px;border:3px solid rgba(255,255,255,.15);border-top-color:#10b981;border-radius:50%;animation:spin .7s linear infinite}
.spinner-dark{width:24px;height:24px;border:3px solid var(--border);border-top-color:#10b981;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}

/* EMPTY */
.empty-st{text-align:center;padding:56px 24px;font-size:12px;color:var(--text3);background:var(--card);border-radius:16px;border:1px solid var(--border);font-weight:500}
.empty-st strong{display:block;font-size:16px;font-weight:800;color:var(--text2);margin-bottom:8px}
.empty-ico{font-size:40px;margin-bottom:14px}

/* BULK ACTIONS */
.bulk-bar{background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:14px;animation:slideIn .2s ease both}
.bulk-count{font-size:13px;font-weight:700;color:#10b981}
.bulk-sep{width:1px;height:20px;background:var(--border)}
.bulk-btn{font-size:12px;font-weight:600;padding:7px 16px;border-radius:8px;border:none;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:6px}
.bulk-btn-rev{background:#ef4444;color:#fff}
.bulk-btn-rev:hover{background:#dc2626}
.bulk-btn-dismiss{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
.bulk-btn-dismiss:hover{background:var(--bg)}
.bulk-clear{margin-left:auto;font-size:11px;color:var(--text3);cursor:pointer;transition:.15s}
.bulk-clear:hover{color:var(--text)}
.row-checkbox{width:15px;height:15px;border-radius:4px;border:1.5px solid var(--border);cursor:pointer;accent-color:#10b981;flex-shrink:0}

/* ONBOARDING */
.onboard-wrap{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:fadeIn .3s ease}
.onboard-card{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:40px;max-width:520px;width:90%;box-shadow:0 40px 100px rgba(0,0,0,.5);animation:scaleIn .3s ease both}
.onboard-logo{display:flex;justify-content:center;margin-bottom:20px}
.onboard-title{font-size:24px;font-weight:900;color:var(--text);text-align:center;letter-spacing:-.5px;margin-bottom:8px}
.onboard-sub{font-size:14px;color:var(--text2);text-align:center;margin-bottom:32px;line-height:1.6}
.onboard-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
.onboard-step{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;border:1.5px solid var(--border);cursor:pointer;transition:.2s}
.onboard-step:hover{border-color:#10b981;background:rgba(16,185,129,.04)}
.onboard-step.done{border-color:#10b981;background:rgba(16,185,129,.06)}
.onboard-step.active{border-color:#a78bfa;background:rgba(167,139,250,.06)}
.onboard-step-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.onboard-step-body{flex:1}
.onboard-step-title{font-size:13px;font-weight:700;color:var(--text)}
.onboard-step-sub{font-size:11px;color:var(--text3);margin-top:2px}
.onboard-step-status{font-size:11px;font-weight:700;flex-shrink:0}
.onboard-progress{height:4px;background:var(--border);border-radius:2px;margin-bottom:20px;overflow:hidden}
.onboard-progress-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#10b981);border-radius:2px;transition:width .4s ease}
.onboard-skip{width:100%;padding:12px;border:none;background:transparent;color:var(--text3);font-size:12px;cursor:pointer;transition:.15s}
.onboard-skip:hover{color:var(--text2)}

/* RISK TIMELINE */
.timeline-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;animation:fadeIn .4s ease both}
.timeline-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.timeline-title{font-size:13px;font-weight:700;color:var(--text)}
.timeline-legend{display:flex;gap:14px;font-size:10px;color:var(--text3)}
.timeline-legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:middle}
.timeline-canvas{width:100%;height:120px;position:relative;overflow:hidden}
.timeline-grid-line{position:absolute;left:0;right:0;height:1px;background:var(--border2)}
.timeline-area{position:absolute;bottom:0;left:0;right:0}

/* NOTIFICATIONS SETTINGS */
.notif-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px}
.notif-row{display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--border2)}
.notif-row:last-child{border-bottom:none}
.notif-ico{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.notif-body{flex:1}
.notif-title{font-size:12px;font-weight:700;color:var(--text)}
.notif-sub{font-size:11px;color:var(--text3);margin-top:2px}
.notif-inp{font-size:12px;padding:7px 11px;border-radius:8px;border:1.5px solid var(--input-border);background:var(--input-bg);color:var(--text);outline:none;width:100%;margin-top:8px;transition:.15s}
.notif-inp:focus{border-color:#10b981}

/* MOBILE RESPONSIVE */
.hide-mobile{display:inline}
@media(max-width:768px){
  .hide-mobile{display:none}
  .shell{flex-direction:column;width:100vw;height:100dvh;height:100vh}
  .content{flex:1;min-height:0;order:1;display:flex;flex-direction:column;overflow:hidden}
  .topbar{padding:0 12px;height:50px;min-height:50px;flex-shrink:0}
  .tb-title{font-size:14px;letter-spacing:-.3px}
  .tb-sub{font-size:9px;gap:3px;flex-wrap:nowrap;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:180px}
  .tb-r{gap:4px;flex-shrink:0}
  .btn-sec{padding:5px 8px;font-size:11px}
  .btn-pri{padding:5px 12px;font-size:11px}
  .scroll-area{padding:10px 10px 70px;gap:10px}
  .sidebar{order:2;width:100%;height:54px;min-height:54px;flex-shrink:0;flex-direction:row;background:#060d1a;border-top:1px solid rgba(255,255,255,.1);border-right:none;overflow:hidden}
  .sb-brand{display:none}
  .sb-footer{display:none}
  .sb-lang{display:none}
  .sb-dm-row{display:none}
  .sb-inner{flex:1;display:flex;flex-direction:row;align-items:center;overflow:hidden;height:100%}
  .sb-nav{display:flex;flex-direction:row;align-items:center;padding:4px 6px;gap:2px;width:100%;justify-content:space-around;overflow-x:auto;scrollbar-width:none}
  .sb-nav::-webkit-scrollbar{display:none}
  .sb-sec{display:none}
  .sb-link{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 6px;border-radius:8px;margin-bottom:0;font-size:9px;font-weight:600;color:rgba(255,255,255,.4);min-width:44px;gap:2px;white-space:nowrap;border:1px solid transparent}
  .sb-link.active{background:rgba(16,185,129,.12);color:#10b981;border-color:rgba(16,185,129,.2)}
  .sb-icon{width:15px;height:15px;display:block !important;opacity:.5;flex-shrink:0}
  .sb-link.active .sb-icon{opacity:1}
  .sb-badge{font-size:7px;padding:1px 3px}
  .kpi-row{grid-template-columns:1fr 1fr;gap:8px}
  .kpi{padding:12px 10px;border-radius:12px}
  .kpi-lbl{font-size:8px;margin-bottom:6px}
  .kpi-val{font-size:22px}
  .kpi-sub{font-size:9px;margin-top:3px}
  .ring-wrap{gap:8px}
  .ring{width:40px;height:40px}
  .ring svg{width:40px;height:40px}
  .ring-grade{font-size:11px}
  .dbar-lbl{font-size:9px;min-width:34px}
  .dbar-n{font-size:9px}
  .mid-row{grid-template-columns:1fr;gap:10px}
  .card{padding:14px}
  .card-title{font-size:12px}
  .pbar-lbl{font-size:9px;min-width:90px}
  .al-ttl{font-size:10px}
  .al-meta{font-size:9px}
  .tcard{border-radius:12px}
  .tbar{flex-direction:column;align-items:stretch;gap:8px;padding:10px 12px}
  .tbar-title{font-size:12px}
  .filters{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:5px;scrollbar-width:none;padding-bottom:2px}
  .filters::-webkit-scrollbar{display:none}
  .srch{width:110px;font-size:10px;padding:5px 8px}
  .chip{font-size:9px;padding:3px 7px;white-space:nowrap}
  table{font-size:9px}
  thead th{padding:6px 5px;font-size:8px}
  tbody td{padding:8px 5px}
  .app-nm{font-size:10px}
  .app-pl{font-size:8px}
  .btn-rev{font-size:9px;padding:3px 7px}
  .btn-rvw{font-size:9px;padding:3px 7px}
  thead th:nth-child(4),tbody td:nth-child(4),thead th:nth-child(6),tbody td:nth-child(6){display:none}
  .tfoot{font-size:9px;padding:7px 12px}
  .profile-grid,.guide-grid,.int-grid,.comp-2col,.add-app-grid,.form-grid{grid-template-columns:1fr}
  .comp-hero{grid-template-columns:1fr 1fr;gap:10px;padding:14px}
  .comp-n{font-size:26px}
  .modal-box{width:92%;padding:20px;border-radius:16px}
  .onboard-card{padding:22px;width:94%;border-radius:18px}
  .onboard-title{font-size:19px}
  .dp{width:100%;border-left:none}
  .auth-wrap{align-items:flex-start;padding:16px 14px 40px}
  .auth-card{padding:24px 18px;border-radius:16px}
  .auth-bname{font-size:20px}
  .auth-title{font-size:20px}
  .auth-sub{font-size:12px;margin-bottom:20px}
  .auth-tabs{margin-bottom:16px}
  .bulk-bar{padding:8px 12px;gap:8px}
  .timeline-card{padding:14px}
}

/* RTL FULL SUPPORT */
.rtl-layout{direction:rtl}
.rtl-layout .sidebar{border-right:none;border-left:1px solid rgba(255,255,255,.05)}
.rtl-layout .sb-badge{margin-left:0;margin-right:auto}
.rtl-layout .sb-out{margin-left:0;margin-right:auto}
.rtl-layout thead th{text-align:right}
.rtl-layout tbody td{text-align:right}
.rtl-layout .app-cell{flex-direction:row-reverse;text-align:right}
.rtl-layout .rbar-wrap{flex-direction:row-reverse}
.rtl-layout .cf-wrap{flex-direction:row-reverse}
.rtl-layout .act-wrap{flex-direction:row-reverse}
.rtl-layout .tbar{flex-direction:row-reverse}
.rtl-layout .filters{flex-direction:row-reverse}
.rtl-layout .card-hd{flex-direction:row-reverse}
.rtl-layout .al-item{flex-direction:row-reverse}
.rtl-layout .al-body{text-align:right}
.rtl-layout .al-acts{flex-direction:row-reverse}
.rtl-layout .kpi-lbl{text-align:right}
.rtl-layout .kpi-val{text-align:right}
.rtl-layout .kpi-sub{text-align:right}
.rtl-layout .ring-wrap{flex-direction:row-reverse}
.rtl-layout .dbar{flex-direction:row-reverse}
.rtl-layout .pbar{flex-direction:row-reverse}
.rtl-layout .dp{left:0;right:auto;transform:translateX(-100%)}
.rtl-layout .dp.open{transform:translateX(0)}
.rtl-layout .dp-hd{flex-direction:row-reverse}
.rtl-layout .dp-row{flex-direction:row-reverse}
.rtl-layout .dp-val{text-align:left}
.rtl-layout .tb-l{text-align:right}
.rtl-layout .tb-r{flex-direction:row-reverse}
.rtl-layout .topbar{flex-direction:row-reverse}
.rtl-layout .profile-grid{direction:rtl}
.rtl-layout .sb-user{flex-direction:row-reverse}
.rtl-layout .form-grid{direction:rtl}
.rtl-layout .section-title{flex-direction:row-reverse}
.rtl-layout .toggle-row{flex-direction:row-reverse}
.rtl-layout .guide-card-header{flex-direction:row-reverse}
.rtl-layout .guide-items{direction:rtl}
.rtl-layout .guide-item{flex-direction:row-reverse;text-align:right}
.rtl-layout .int-header{flex-direction:row-reverse}
.rtl-layout .int-status{margin-left:0;margin-right:auto}
.rtl-layout .comp-2col{direction:rtl}
.rtl-layout .ctrl-hd{flex-direction:row-reverse}
.rtl-layout .ctrl-item{flex-direction:row-reverse}
.rtl-layout .rev-item{flex-direction:row-reverse}
.rtl-layout .rev-time{margin-left:0;margin-right:auto}
.rtl-layout .modal-btns{flex-direction:row-reverse}
.rtl-layout .sb-link{flex-direction:row-reverse;text-align:right}
.rtl-layout .sb-brand{flex-direction:row-reverse}

/* DARK MODE — override any remaining white backgrounds */
html.dark .tcard,html.dark .card,html.dark .kpi,html.dark .comp-hero,html.dark .ctrl-card,html.dark .pm-wrap,html.dark .rev-item,html.dark .alert-card,html.dark .int-card,html.dark .profile-sidebar-card,html.dark .profile-main-card,html.dark .guide-card,html.dark .add-app-card,html.dark .auth-card{background:var(--card) !important;border-color:var(--border) !important}
html.dark tbody td{color:var(--text) !important}
html.dark thead th{color:var(--text3) !important;background:var(--th-bg) !important}
html.dark tbody tr:hover td{background:var(--tr-hover) !important}
html.dark .tbar{background:var(--card)}
html.dark .ctrl-hd{background:var(--th-bg) !important}
html.dark .add-app-body{background:var(--card)}
html.dark .add-app-footer{background:var(--bg3)}
html.dark input,html.dark select,html.dark textarea{background:var(--input-bg) !important;color:var(--text) !important;border-color:var(--input-border) !important}
html.dark .sb-dm-lbl{color:rgba(255,255,255,.5)}
html.dark .card-title{color:var(--text)}
html.dark .tb-title{color:var(--text)}
html.dark .app-nm{color:var(--text)}
html.dark .tbar-title{color:var(--text)}
`;


// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtUsers = a => a.users_type==="records"?(a.users_affected||0).toLocaleString()+" rec.":a.users_type==="repos"?(a.users_affected||0)+" repos":(a.users_affected||0).toLocaleString();
const scColor = s => s>=65?"#10b981":s>=40?"#f59e0b":"#ef4444";
const rColor = s => s>=70?"#ef4444":s>=40?"#f59e0b":"#10b981";
const grade = s => s>=90?"A+":s>=80?"A":s>=70?"B+":s>=60?"B":s>=50?"C+":s>=40?"C":"D+";

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const Icon = ({ name, size=16, color="currentColor" }) => {
  const icons = {
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5 3.5 9.74 9 11 5.5-1.26 9-6 9-11V6L12 2z" fill={color} fillOpacity=".9"/><path d="M8 12l3 3 5-6" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    apps: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="9" height="9" rx="2"/><rect x="13" y="2" width="9" height="9" rx="2"/><rect x="2" y="13" width="9" height="9" rx="2"/><rect x="13" y="13" width="9" height="9" rx="2"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  };
  return icons[name] || null;
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("en");
  const [authMode, setAuthMode] = useState("login");
  const [session, setSession] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [showLanding, setShowLanding] = useState(true);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [roleVal, setRoleVal] = useState("it_manager");
  const [page, setPage] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [org, setOrg] = useState(null);
  const [apps, setApps] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [revs, setRevs] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [sortCol, setSortCol] = useState("risk_score");
  const [sortDir, setSortDir] = useState(-1);
  const [filter, setFilter] = useState("all");
  const [fsStale, setFsStale] = useState(false);
  const [fsSOC, setFsSOC] = useState(false);
  const [fsGDPR, setFsGDPR] = useState(false);
  const [q, setQ] = useState("");
  const [detailApp, setDetailApp] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState({ show:false, msg:"" });
  const [scanMin, setScanMin] = useState(4);
  const [scanning, setScanning] = useState(false);
  const [scanningPlatform, setScanningPlatform] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("sg-dark");
    const isDark = saved === null ? true : saved === "1";
    // Apply immediately to avoid flash
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    document.body.style.background = isDark ? "#060d1a" : "#f1f5f9";
    return isDark;
  });
  const [isDemo, setIsDemo] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardDone, setOnboardDone] = useState(() => localStorage.getItem("sg-onboarded")==="1");
  const [notifEmail, setNotifEmail] = useState(() => localStorage.getItem("sg-notif-email")||"");
  const [notifSlackUrl, setNotifSlackUrl] = useState(() => localStorage.getItem("sg-notif-slack")||"");
  const [scoreHistory, setScoreHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sg-score-history")||"[]"); } catch { return []; }
  });
  const toastRef = useRef(null);
  const t = LANGS[lang];

  // Computed values — must be before useEffects that depend on them
  const active = apps.filter(a=>!a.is_revoked);
  const sec = active.length ? Math.max(0, Math.round(100 - active.reduce((s,a)=>s+(a.risk_score||0),0)/active.length)) : 0;

  useEffect(() => {
    // Clean error params from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) window.history.replaceState({}, "", window.location.pathname);

    // Single auth check — getSession first, then listen for changes
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s || null);
      setAppLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session && !isDemo) load(); }, [session]);

  // Show onboarding for new users
  useEffect(() => {
    if (session && !onboardDone && apps.length === 0 && platforms.length === 0) {
      setTimeout(() => setShowOnboarding(true), 1200);
    }
  }, [session, onboardDone, apps.length, platforms.length]);

  // Save score history
  useEffect(() => {
    if (sec > 0 && apps.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      setScoreHistory(prev => {
        const filtered = prev.filter(p => p.date !== today);
        const next = [...filtered, { date: today, score: sec }].slice(-30);
        localStorage.setItem("sg-score-history", JSON.stringify(next));
        return next;
      });
    }
  }, [sec]);

  // Realtime subscriptions
  useEffect(() => {
    if (!profile?.org_id) return;
    const channel = supabase.channel("realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "connected_apps", filter: `org_id=eq.${profile.org_id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `org_id=eq.${profile.org_id}` }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile?.org_id]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (prof) { setProfile(prof); if (prof.language) setLang(prof.language); }
      if (!prof?.org_id) return;

      const { data: orgData } = await supabase.from("organizations").select("*").eq("id", prof.org_id).single();
      setOrg(orgData);

      const [aR, alR, rR, pR] = await Promise.all([
        supabase.from("connected_apps").select("*, platform:platforms(name), permissions:app_permissions(*), compliance:app_compliance_flags(framework:compliance_frameworks(name,short_code))").eq("org_id", prof.org_id).order("risk_score", { ascending: false }),
        supabase.from("alerts").select("*").eq("org_id", prof.org_id).eq("status", "open").order("created_at", { ascending: false }),
        supabase.from("revocation_log").select("*").eq("org_id", prof.org_id).order("performed_at", { ascending: false }),
        supabase.from("platforms").select("*").eq("org_id", prof.org_id),
      ]);
      setApps(aR.data || []);
      setAlerts(alR.data || []);
      setRevs(rR.data || []);
      setPlatforms(pR.data || []);
    } finally { setBusy(false); }
  }, [session]);

  const doSignIn = async e => {
    e.preventDefault(); setAuthBusy(true); setAuthErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setAuthErr(error.message);
    setAuthBusy(false);
  };

  const doRegister = async e => {
    e.preventDefault(); setAuthBusy(true); setAuthErr("");
    try {
      const { data: authData, error: aErr } = await supabase.auth.signUp({ email, password: pass });
      if (aErr) throw aErr;
      const uid = authData.user?.id;
      if (!uid) throw new Error("Registration failed — please check your email to confirm, then sign in.");
      // Create org first
      const { data: orgData, error: oErr } = await supabase.from("organizations").insert({ name: orgName || `${fullName}'s Organization` }).select().single();
      if (oErr) throw oErr;
      // Then create profile (requires confirmed user or RLS disabled)
      const { error: pErr } = await supabase.from("profiles").upsert({ id: uid, org_id: orgData.id, full_name: fullName, role: roleVal, language: lang });
      if (pErr) throw pErr;
      showToast("Account created! Check your email then sign in.");
      setAuthMode("login");
    } catch (err) { setAuthErr(err.message); }
    setAuthBusy(false);
  };

  const doGoogleSignIn = async () => {
    setAuthBusy(true); setAuthErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    });
    if (error) { setAuthErr(error.message); setAuthBusy(false); }
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("sg-dark", next ? "1" : "0");
    document.documentElement.classList.toggle("dark", next);
    document.body.style.background = next ? "#060d1a" : "#f1f5f9";
  };

  const enterDemo = () => {
    // Set all demo state at once
    setIsDemo(true);
    setShowLanding(false);
    setSession({ user: { id:"demo", email:"demo@scopeguard.io" } });
    setProfile(DEMO_PROFILE);
    setOrg(DEMO_ORG);
    setApps(DEMO_APPS);
    setAlerts(DEMO_ALERTS);
    setRevs(DEMO_REVS);
    setPlatforms(DEMO_PLATFORMS);
    setAppLoading(false);
    setPage("dashboard");
  };

  const doSignOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      setSession(null);
      setApps([]); setAlerts([]); setRevs([]); setProfile(null); setOrg(null); setPlatforms([]);
      return;
    }
    await supabase.auth.signOut();
    setSession(null); setApps([]); setAlerts([]); setRevs([]); setProfile(null);
  };

  const bulkRevoke = async () => {
    const toRevoke = apps.filter(a => selectedApps.has(a.id) && !a.is_revoked);
    for (const app of toRevoke) await revokeApp(app);
    setSelectedApps(new Set());
    showToast(`✓ ${toRevoke.length} apps revoked`);
  };

  const toggleSelect = (id) => setSelectedApps(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => setSelectedApps(new Set(filtApps.filter(a=>!a.is_revoked).map(a=>a.id)));

  const exportPDF = () => {
    const rows = apps.filter(a=>!a.is_revoked).map(a =>
      `<tr><td>${a.name}</td><td>${a.platform?.name||'-'}</td><td style="color:${rColor(a.risk_score||0)};font-weight:bold">${a.risk_score||0}</td><td>${SEV_TXT[a.severity]||'-'}</td><td>${fmtUsers(a)}</td><td>${a.verified?"✓ Verified":"⚠ Unverified"}</td></tr>`
    ).join("");
    const date = new Date().toLocaleDateString();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ScopeGuard Security Report</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #10b981}
    .logo{width:48px;height:48px;background:linear-gradient(135deg,#a78bfa,#10b981);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px}
    h1{margin:0;font-size:24px;color:#0f172a}
    .subtitle{color:#64748b;font-size:13px;margin-top:4px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}
    .kpi-n{font-size:28px;font-weight:900;color:#0f172a}
    .kpi-l{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f1f5f9;padding:10px 14px;text-align:left;font-weight:700;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9}
    .section-title{font-size:16px;font-weight:800;color:#0f172a;margin:28px 0 14px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
    .rec{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:12px}
    .rec-title{font-size:13px;font-weight:700;color:#065f46;margin-bottom:4px}
    .rec-desc{font-size:12px;color:#047857}
    </style></head><body>
    <div class="header"><div class="logo">S</div><div><h1>ScopeGuard Security Report</h1><div class="subtitle">Generated on ${date} · ${org?.name||"Organization"}</div></div></div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-n" style="color:${scColor(sec)}">${sec}/100</div><div class="kpi-l">Security Score</div></div>
      <div class="kpi"><div class="kpi-n">${apps.filter(a=>!a.is_revoked).length}</div><div class="kpi-l">Connected Apps</div></div>
      <div class="kpi"><div class="kpi-n" style="color:#ef4444">${critN}</div><div class="kpi-l">Critical Risks</div></div>
      <div class="kpi"><div class="kpi-n" style="color:#f59e0b">${staleN}</div><div class="kpi-l">Stale Tokens</div></div>
    </div>
    <div class="section-title">Recommendations</div>
    ${critN>0?`<div class="rec"><div class="rec-title">⚠️ ${critN} Critical app${critN>1?"s require":"  requires"} immediate action</div><div class="rec-desc">Review and revoke access for apps with risk scores above 70. These pose the highest risk to your organization.</div></div>`:""}
    ${staleN>0?`<div class="rec"><div class="rec-title">⏱ ${staleN} stale token${staleN>1?"s have":"  has"} not been used in 90+ days</div><div class="rec-desc">Inactive integrations with live tokens are a common attack vector. Revoke access for apps that are no longer in use.</div></div>`:""}
    ${compGaps>0?`<div class="rec"><div class="rec-title">📋 ${compGaps} app${compGaps>1?"s affect":"  affects"} your compliance posture</div><div class="rec-desc">Review compliance mapping for SOC 2 and GDPR. Ensure all vendors with PII access have signed DPAs.</div></div>`:""}
    <div class="section-title">Application Inventory (${apps.filter(a=>!a.is_revoked).length} apps)</div>
    <table><thead><tr><th>Application</th><th>Platform</th><th>Risk Score</th><th>Severity</th><th>Users</th><th>Publisher</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer"><span>ScopeGuard SSPM Platform</span><span>Confidential — ${org?.name||"Organization"} Internal Use Only</span></div>
    </body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ScopeGuard-Report-${date.replace(/\//g,"-")}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("✓ Report downloaded!");
  };

  const saveNotifSettings = () => {
    localStorage.setItem("sg-notif-email", notifEmail);
    localStorage.setItem("sg-notif-slack", notifSlackUrl);
    showToast("✓ Notification settings saved!");
  };
  const changeLang = async l => { setLang(l); if (session) await supabase.from("profiles").update({ language: l }).eq("id", session.user.id); };

  const showToast = (msg) => {
    setToast({ show:true, msg });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show:false, msg:"" }), 2800);
  };

  const revokeApp = async app => {
    if (!app) return;
    if (isDemo) {
      setApps(prev => prev.map(a => a.id===app.id ? {...a, is_revoked:true} : a));
      setAlerts(prev => prev.filter(a => a.app_id!==app.id));
      setRevs(prev => [{id:"r"+Date.now(), app_name:app.name, platform:app.platform?.name, performed_by:"demo", performed_at:new Date().toISOString()}, ...prev]);
      setModal(null); setDetailApp(null);
      showToast(`✓ ${app.name} revoked`);
      return;
    }
    await supabase.from("connected_apps").update({ is_revoked:true, revoked_at:new Date().toISOString(), revoked_by:session.user.id }).eq("id", app.id);
    await supabase.from("revocation_log").insert({ org_id:profile.org_id, app_id:app.id, app_name:app.name, platform:app.platform?.name, performed_by:session.user.id });
    await supabase.from("alerts").update({ status:"resolved", resolved_at:new Date().toISOString() }).eq("app_id", app.id);
    setModal(null); setDetailApp(null);
    showToast(`✓ ${app.name} ${t.revokedLabel.toLowerCase()}`);
    load();
  };

  const dismissAlert = async id => {
    await supabase.from("alerts").update({ status:"dismissed" }).eq("id", id);
    showToast(t.dismiss); load();
  };

  // OAuth connection handlers
  const connectGitHub = () => {
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = "read:org,repo,admin:org";
    const state = btoa(JSON.stringify({ user_id: session.user.id, org_id: profile.org_id }));
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  };

  const connectSlack = () => {
    const redirectUri = `${window.location.origin}/auth/slack/callback`;
    const scope = "admin,apps:read,oauth.v2.access";
    const state = btoa(JSON.stringify({ user_id: session.user.id, org_id: profile.org_id }));
    window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  };

  const triggerScan = async (platformName) => {
    const platform = platforms.find(p => p.name === platformName);
    if (!platform) return;
    setScanningPlatform(platformName);
    try {
      const fnName = platformName.toLowerCase() === "github" ? "github-scan" : "slack-scan";
      const { data, error } = await supabase.functions.invoke(fnName, { body: { org_id: profile.org_id, platform_id: platform.id } });
      if (error) throw error;
      showToast(`✓ ${platformName} scan complete — ${data.apps_found || 0} apps found`);
      load();
    } catch (err) {
      showToast(`Scan error: ${err.message}`);
    }
    setScanningPlatform(null);
  };

  const doScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setScanMin(0); showToast(`${t.scanComplete} — ${apps.filter(a=>a.severity==="critical"&&!a.is_revoked).length} ${t.criticalRisks}`); load(); }, 1800);
  };

  const sortBy = col => { if (sortCol===col) setSortDir(d=>d*-1); else { setSortCol(col); setSortDir(-1); } };

  // Computed values
  const critN = active.filter(a=>a.severity==="critical").length;
  const highN = active.filter(a=>a.severity==="high").length;
  const safeN = active.filter(a=>["medium","low"].includes(a.severity)).length;
  const staleN = active.filter(a=>a.is_stale).length;
  const socApps = active.filter(a=>a.compliance?.some(c=>c.framework?.short_code==="soc2"));
  const gdprApps = active.filter(a=>a.compliance?.some(c=>c.framework?.short_code==="gdpr"));
  const compGaps = active.filter(a=>a.compliance?.length>0).length;
  const perim = 2*Math.PI*20;
  const filled = (sec/100)*perim;

  const filtApps = apps.filter(a => {
    if (filter==="critical" && a.severity!=="critical") return false;
    if (filter==="high" && !["critical","high"].includes(a.severity)) return false;
    if (fsStale && !a.is_stale) return false;
    if (fsSOC && !a.compliance?.some(c=>c.framework?.short_code==="soc2")) return false;
    if (fsGDPR && !a.compliance?.some(c=>c.framework?.short_code==="gdpr")) return false;
    return true;
  }).sort((a,b) => { const av=a[sortCol]??0, bv=b[sortCol]??0; return (av>bv?1:av<bv?-1:0)*sortDir; });

  const permCols = ["Email","Repos","Channels","Contacts","Admin","Files"];
  const hasP = (app, i) => {
    const ps=(app.permissions||[]).map(p=>p.scope||"");
    return [ps.some(p=>p.includes("gmail")||p.includes("mail")),ps.some(p=>p.includes("repo")),ps.some(p=>p.includes("channel")||p.includes("message")),ps.some(p=>p.includes("contact")||p.includes("lead")),ps.some(p=>p.includes("admin")||p.includes("org")),ps.some(p=>p.includes("drive")||p.includes("file"))][i];
  };

  const pageTitles = { dashboard:t.dashboard, inventory:t.inventory, alerts:t.alerts, permissions:t.permissions, revocations:t.revocations, soc2:"SOC 2", gdpr:"GDPR", add_app:t.addApp, profile:t.profile, integrations:t.integrations, guide:"📖 Platform Guide" };

  // ── LOADING ──
  if (appLoading) return (
    <><style>{CSS}</style>
    <div className="loading-pg">
      <div className="loading-logo">
        <svg viewBox="0 0 24 24" fill="none" width="34" height="34"><path d="M12 2L3 6v6c0 5 3.5 9.74 9 11 5.5-1.26 9-6 9-11V6L12 2z" fill="#fff" fillOpacity=".9"/><path d="M8 12l3 3 5-6" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div className="loading-name">ScopeGuard</div>
      <div className="loading-sub">Protect every connection</div>
      <div className="spinner"/>
    </div></>
  );

  // ── AUTH ──
  if (showLanding && !isDemo) {
    return (
      <><style>{CSS}<style>{`
        .lp{min-height:100vh;background:linear-gradient(135deg,#060d1a 0%,#0a1628 50%,#061a10 100%);display:flex;flex-direction:column;font-family:'Inter',-apple-system,sans-serif;color:#fff;overflow-x:hidden;overflow-y:auto}
        html body{overflow:auto !important;height:auto !important}
        html{overflow:auto !important;height:auto !important}
        #root{height:auto !important;overflow:visible !important}
        .lp-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 6%;border-bottom:1px solid rgba(255,255,255,.06)}
        .lp-nav-logo{display:flex;align-items:center;gap:10px}
        .lp-nav-brand{font-size:20px;font-weight:900;letter-spacing:-.5px;color:#fff}
        .lp-nav-btns{display:flex;gap:8px;align-items:center}
        .lp-btn-out{padding:8px 16px;border-radius:9px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer;transition:.15s;white-space:nowrap}
        .lp-btn-out:hover{border-color:rgba(255,255,255,.3);color:#fff}
        .lp-btn-pri{padding:8px 16px;border-radius:9px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:.15s;white-space:nowrap}
        .lp-btn-pri:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(16,185,129,.35)}
        .lp-hero{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px 6% 70px;position:relative}
        .lp-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 16px;border-radius:20px;border:1px solid rgba(167,139,250,.3);background:rgba(167,139,250,.08);font-size:12px;font-weight:600;color:#a78bfa;margin-bottom:28px}
        .lp-badge-dot{width:6px;height:6px;border-radius:50%;background:#a78bfa;animation:pulse 2s ease-in-out infinite}
        .lp-h1{font-size:clamp(38px,6vw,72px);font-weight:900;letter-spacing:-2px;line-height:1.05;margin-bottom:22px;max-width:820px}
        .lp-h1 .gr{background:linear-gradient(135deg,#a78bfa,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-sub{font-size:clamp(15px,2vw,19px);color:rgba(255,255,255,.55);max-width:540px;margin-bottom:40px;line-height:1.7}
        .lp-ctas{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-bottom:60px}
        .lp-cta-pri{padding:14px 32px;border-radius:12px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:15px;font-weight:700;cursor:pointer;transition:.2s}
        .lp-cta-pri:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(16,185,129,.4)}
        .lp-cta-sec{padding:14px 32px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.7);font-size:15px;font-weight:600;cursor:pointer;transition:.2s}
        .lp-cta-sec:hover{border-color:rgba(255,255,255,.25);color:#fff}
        .lp-stats{display:flex;gap:48px;padding:32px 0;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);flex-wrap:wrap;justify-content:center;width:100%;max-width:700px}
        .lp-stat-n{font-size:38px;font-weight:900;background:linear-gradient(135deg,#10b981,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lp-stat-l{font-size:11px;color:rgba(255,255,255,.35);font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-top:4px}
        .lp-features{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:60px 6%;max-width:1100px;margin:0 auto;width:100%}
        .lp-feat{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:26px;transition:.2s}
        .lp-feat:hover{border-color:rgba(16,185,129,.25);transform:translateY(-3px)}
        .lp-feat-ico{font-size:28px;margin-bottom:14px}
        .lp-feat-title{font-size:15px;font-weight:800;color:#fff;margin-bottom:8px}
        .lp-feat-desc{font-size:13px;color:rgba(255,255,255,.45);line-height:1.7}
        .lp-footer{padding:28px 6%;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .lp-footer-brand{font-size:14px;font-weight:700;color:rgba(255,255,255,.4)}
        .lp-footer-copy{font-size:12px;color:rgba(255,255,255,.2)}
        @media(max-width:768px){
          .lp-features{grid-template-columns:1fr}
          .lp-stats{gap:20px}
          .lp-nav{padding:10px 4%;height:56px}
          .lp-nav-brand{font-size:15px}
          .lp-nav-logo svg{width:26px;height:26px}
          .lp-nav-btns{gap:6px}
          .lp-btn-out{padding:6px 12px;font-size:12px}
          .lp-btn-pri{padding:6px 12px;font-size:12px}
          .lp-h1{font-size:30px;letter-spacing:-1px}
          .lp-hero{padding:40px 5% 32px}
          .lp-sub{font-size:13px}
          .lp-cta-pri,.lp-cta-sec{padding:12px 20px;font-size:13px;width:100%;text-align:center}
          .lp-ctas{flex-direction:column;align-items:center;gap:10px}
          .lp-stat-n{font-size:26px}
          .lp-stat-l{font-size:9px}
          .lp-features{padding:32px 4%}
          .lp-features{grid-template-columns:1fr}
          .lp-feat{padding:18px}
        }
      `}</style></style>
      <div className="lp">
        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-nav-logo">
            <svg viewBox="0 0 36 36" fill="none" width="32" height="32">
              <defs><linearGradient id="lng1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#34d399"/></linearGradient></defs>
              <rect x="1" y="1" width="34" height="34" rx="9" fill="#0e0d1f" stroke="url(#lng1)" strokeWidth=".8"/>
              <path d="M18 4L8 9v9c0 7 5 12 10 14 5-2 10-7 10-14V9Z" fill="none" stroke="url(#lng1)" strokeWidth="1.4"/>
              <path d="M12 14c0-3 12-3 12 0s-12 3-12 6 12 3 12 0" stroke="url(#lng1)" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </svg>
            <span className="lp-nav-brand">ScopeGuard</span>
          </div>
          <div className="lp-nav-btns">
            <button className="lp-btn-out" onClick={()=>setShowLanding(false)}>{session ? "Dashboard →" : "Sign In"}</button>
            <button className="lp-btn-pri" onClick={()=>{setShowLanding(false);if(!session)setAuthMode("register")}}>Get Started Free →</button>
          </div>
        </nav>

        {/* HERO */}
        <div className="lp-hero">
          <div className="lp-badge"><div className="lp-badge-dot"/>Real-time SaaS security scanning</div>
          <h1 className="lp-h1">Know every app.<br/><span className="gr">Trust every connection.</span></h1>
          <p className="lp-sub">ScopeGuard automatically discovers and monitors every third-party app connected to your company — and lets you revoke dangerous access in one click.</p>
          <div className="lp-ctas">
            <button className="lp-cta-pri" onClick={()=>{setShowLanding(false);setAuthMode("register")}}>Start securing for free →</button>
            <button className="lp-cta-sec" onClick={enterDemo}>🚀 Try live demo</button>
          </div>
          <div className="lp-stats">
            <div><div className="lp-stat-n">137</div><div className="lp-stat-l">avg apps per company</div></div>
            <div><div className="lp-stat-n">68%</div><div className="lp-stat-l">never audited</div></div>
            <div><div className="lp-stat-n">$4.5M</div><div className="lp-stat-l">avg cost of SaaS breach</div></div>
            <div><div className="lp-stat-n">90s</div><div className="lp-stat-l">to first scan</div></div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="lp-features">
          {[
            ["🔍","Auto Discovery","Connect Slack, GitHub, or Google Workspace and instantly discover every third-party app — no manual entry."],
            ["⚠️","Real-time Risk Scoring","Every app gets a 0–100 risk score. Critical threats surface immediately with actionable alerts."],
            ["⚡","One-click Revocation","Revoke dangerous app access instantly. Every action is logged with a full audit trail."],
            ["📋","SOC 2 & GDPR Ready","Automatic mapping to compliance controls. Export audit reports for stakeholders in one click."],
            ["🔔","Instant Alerts","Get notified via email or Slack the moment a critical or unverified app is detected."],
            ["📊","Risk Timeline","Track your security score over time and show measurable improvement to leadership."],
          ].map(([ico,title,desc])=>(
            <div key={title} className="lp-feat">
              <div className="lp-feat-ico">{ico}</div>
              <div className="lp-feat-title">{title}</div>
              <div className="lp-feat-desc">{desc}</div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="lp-footer">
          <span className="lp-footer-brand">🛡️ ScopeGuard — SSPM Platform</span>
          <span className="lp-footer-copy">© 2026 ScopeGuard. All rights reserved.</span>
        </footer>
      </div></>
    );

    if (session) { setShowLanding(false); return null; }

    const isReg = authMode==="register";
    return (
      <><style>{CSS}{`
        .ma-wrap{min-height:100vh;min-height:100dvh;width:100%;background:#060d1a;display:flex;flex-direction:column;overflow-y:auto}
        .ma-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0}
        .ma-back{display:flex;align-items:center;gap:6px;background:transparent;border:none;color:rgba(255,255,255,.5);font-size:13px;font-weight:600;cursor:pointer;padding:6px 0;transition:.15s}
        .ma-back:hover{color:#10b981}
        .ma-back svg{flex-shrink:0}
        .ma-logo{display:flex;align-items:center;gap:8px}
        .ma-logo-name{font-size:15px;font-weight:800;color:#fff}
        .ma-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:28px 20px 40px}
        .ma-card{width:100%;max-width:420px;display:flex;flex-direction:column;gap:0}
        .ma-tabs{display:flex;background:rgba(255,255,255,.05);border-radius:12px;padding:4px;margin-bottom:24px;border:1px solid rgba(255,255,255,.07)}
        .ma-tab{flex:1;padding:10px;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.4);font-size:14px;font-weight:700;cursor:pointer;transition:.15s}
        .ma-tab.on{background:rgba(255,255,255,.1);color:#fff}
        .ma-title{font-size:26px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-bottom:4px;text-align:center}
        .ma-sub{font-size:13px;color:rgba(255,255,255,.4);text-align:center;margin-bottom:24px}
        .ma-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
        .ma-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        .ma-lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.07em}
        .ma-inp{font-size:15px;padding:13px 14px;border-radius:11px;border:1.5px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#fff;outline:none;transition:.15s;width:100%}
        .ma-inp:focus{border-color:#10b981;background:rgba(255,255,255,.08)}
        .ma-inp::placeholder{color:rgba(255,255,255,.2)}
        .ma-sel{font-size:15px;padding:13px 14px;border-radius:11px;border:1.5px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#fff;outline:none;width:100%;cursor:pointer}
        .ma-sel option{background:#0d1626;color:#fff}
        .ma-btn{width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:15px;font-weight:800;cursor:pointer;margin-top:4px;transition:.2s;letter-spacing:.01em}
        .ma-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,.35)}
        .ma-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .ma-err{font-size:12px;font-weight:600;color:#fca5a5;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);border-radius:9px;padding:10px 14px;margin-top:10px}
        .ma-or{display:flex;align-items:center;gap:12px;margin:16px 0;color:rgba(255,255,255,.2);font-size:12px}
        .ma-or::before,.ma-or::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}
        .ma-google{width:100%;padding:13px;border-radius:12px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:.15s;margin-bottom:10px}
        .ma-google:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2)}
        .ma-demo{width:100%;padding:13px;border-radius:12px;border:1.5px dashed rgba(16,185,129,.35);background:rgba(16,185,129,.05);color:#10b981;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:.15s}
        .ma-demo:hover{background:rgba(16,185,129,.1)}
        .ma-langs{display:flex;justify-content:center;gap:5px;margin-top:20px;flex-wrap:wrap}
        .ma-lang{font-size:11px;font-weight:600;padding:4px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.35);cursor:pointer;transition:.15s}
        .ma-lang:hover{color:rgba(255,255,255,.7)}
        .ma-lang.on{background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;color:#fff}
        @media(max-width:768px){
          .ma-field-row{grid-template-columns:1fr}
          .ma-body{padding:20px 16px 36px}
          .ma-title{font-size:22px}
          .ma-inp,.ma-sel{font-size:16px;padding:12px 13px}
          .ma-btn{padding:13px;font-size:15px}
        }
      `}</style>
      <div className={`ma-wrap ${t.dir==="rtl"?"rtl-layout":"ltr-layout"}`} dir={t.dir}>
        {/* TOP BAR */}
        <div className="ma-top">
          <button className="ma-back" onClick={()=>setShowLanding(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <div className="ma-logo">
            <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
              <defs><linearGradient id="mag1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#34d399"/></linearGradient></defs>
              <rect x="1" y="1" width="26" height="26" rx="7" fill="#0e0d1f" stroke="url(#mag1)" strokeWidth=".8"/>
              <path d="M14 3L6 7v7c0 5 4 9 8 10 4-1 8-5 8-10V7Z" fill="none" stroke="url(#mag1)" strokeWidth="1.2"/>
              <path d="M9 11c0-2 8-2 8 0s-8 2-8 4 8 2 8 0" stroke="url(#mag1)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </svg>
            <span className="ma-logo-name">ScopeGuard</span>
          </div>
        </div>

        {/* FORM BODY */}
        <div className="ma-body">
          <div className="ma-card">
            <div className="ma-tabs">
              <button className={`ma-tab ${!isReg?"on":""}`} onClick={()=>{setAuthMode("login");setAuthErr("")}}>{t.signIn}</button>
              <button className={`ma-tab ${isReg?"on":""}`} onClick={()=>{setAuthMode("register");setAuthErr("")}}>{t.createAccount}</button>
            </div>

            <div className="ma-title">{isReg ? t.registerTitle : t.loginTitle}</div>
            <div className="ma-sub">{isReg ? t.registerSub : t.loginSub}</div>

            <form onSubmit={isReg?doRegister:doSignIn}>
              {isReg && <>
                <div className="ma-field-row">
                  <div className="ma-field">
                    <label className="ma-lbl">{t.fullName}</label>
                    <input className="ma-inp" type="text" placeholder="John Smith" value={fullName} onChange={e=>setFullName(e.target.value)} required/>
                  </div>
                  <div className="ma-field">
                    <label className="ma-lbl">{t.orgName}</label>
                    <input className="ma-inp" type="text" placeholder="Acme Corp" value={orgName} onChange={e=>setOrgName(e.target.value)} required/>
                  </div>
                </div>
                <div className="ma-field">
                  <label className="ma-lbl">{t.role}</label>
                  <select className="ma-sel" value={roleVal} onChange={e=>setRoleVal(e.target.value)}>
                    <option value="ciso">CISO</option>
                    <option value="it_manager">IT Manager</option>
                    <option value="it_admin">IT Administrator</option>
                    <option value="security_analyst">Security Analyst</option>
                    <option value="security_engineer">Security Engineer</option>
                    <option value="devops_engineer">DevOps Engineer</option>
                    <option value="cloud_architect">Cloud Security Architect</option>
                    <option value="compliance_officer">Compliance Officer</option>
                    <option value="auditor">Internal Auditor</option>
                    <option value="vp_engineering">VP Engineering</option>
                    <option value="cto">CTO</option>
                    <option value="founder">Founder / CEO</option>
                    <option value="read_only">Read Only</option>
                  </select>
                </div>
              </>}
              <div className="ma-field">
                <label className="ma-lbl">{t.email}</label>
                <input className="ma-inp" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus/>
              </div>
              <div className="ma-field">
                <label className="ma-lbl">{t.password}</label>
                <input className="ma-inp" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6}/>
              </div>
              <button className="ma-btn" type="submit" disabled={authBusy}>
                {authBusy ? (isReg ? t.creatingAccount : t.signingIn) : (isReg ? t.createAccount : t.signIn)}
              </button>
              {authErr && <div className="ma-err">{authErr}</div>}
            </form>

            <div className="ma-or">or</div>
            <button className="ma-google" onClick={doGoogleSignIn} disabled={authBusy}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
            <button className="ma-demo" onClick={enterDemo}>
              🚀 Try Demo — no account needed
            </button>

            <div className="ma-langs">
              {Object.entries(LANG_NAMES).map(([k,v])=>(
                <button key={k} className={`ma-lang ${lang===k?"on":""}`} onClick={()=>changeLang(k)}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      </div></>
    );
  }

  // ── TABLE ──
  const AppTable = () => {
    const [localQ, setLocalQ] = useState("");
    const filtApps = apps.filter(a => {
      const lq = localQ.toLowerCase();
      if (lq && !a.name?.toLowerCase().includes(lq) && !(a.platform?.name||"").toLowerCase().includes(lq)) return false;
      if (filter==="critical" && a.severity!=="critical") return false;
      if (filter==="high" && !["critical","high"].includes(a.severity)) return false;
      if (fsStale && !a.is_stale) return false;
      if (fsSOC && !a.compliance?.some(c=>c.framework?.short_code==="soc2")) return false;
      if (fsGDPR && !a.compliance?.some(c=>c.framework?.short_code==="gdpr")) return false;
      return true;
    }).sort((a,b) => { const av=a[sortCol]??0, bv=b[sortCol]??0; return (av>bv?1:av<bv?-1:0)*sortDir; });

    return (
    <div className="tcard">
      <div className="tbar">
        <span className="tbar-title">{t.inventory||"App Inventory"}</span>
        <div className="filters">
          <input
            className="srch"
            placeholder={t.search}
            value={localQ}
            onChange={e => setLocalQ(e.target.value)}
            autoComplete="off"
          />
          <span className={`chip ${filter==="critical"?"chip-r":""}`} onClick={()=>setFilter(f=>f==="critical"?"all":"critical")}>{t.filterCritical}{critN>0?` (${critN})`:""}</span>
          <span className={`chip ${filter==="high"?"chip-a":""}`} onClick={()=>setFilter(f=>f==="high"?"all":"high")}>{t.filterHigh}</span>
          <span className={`chip ${filter==="all"&&!fsStale&&!fsSOC&&!fsGDPR?"chip-g":""}`} onClick={()=>{setFilter("all");setFsStale(false);setFsSOC(false);setFsGDPR(false)}}>{t.filterAll}</span>
          <span className={`chip ${fsStale?"chip-a":""}`} onClick={()=>setFsStale(v=>!v)}>{t.filterStale}</span>
          <span className={`chip ${fsSOC?"chip-a":""}`} onClick={()=>setFsSOC(v=>!v)}>SOC 2</span>
          <span className={`chip ${fsGDPR?"chip-a":""}`} onClick={()=>setFsGDPR(v=>!v)}>GDPR</span>
        </div>
      </div>
      {selectedApps.size > 0 && (
        <div style={{padding:"8px 18px"}}>
          <div className="bulk-bar">
            <span className="bulk-count">{selectedApps.size} selected</span>
            <div className="bulk-sep"/>
            <button className="bulk-btn bulk-btn-rev" onClick={bulkRevoke}>⚡ Revoke all</button>
            <span className="bulk-clear" onClick={()=>setSelectedApps(new Set())}>✕ Clear</span>
          </div>
        </div>
      )}
      <div style={{overflowX:"auto",width:"100%"}}>
        <table style={{minWidth:860}}>
          <colgroup><col style={{width:36}}/><col style={{width:200}}/><col style={{width:110}}/><col style={{width:160}}/><col style={{width:80}}/><col style={{width:100}}/><col style={{width:120}}/></colgroup>
          <thead><tr>
            <th style={{padding:"10px 12px"}}><input type="checkbox" className="row-checkbox" checked={selectedApps.size>0&&selectedApps.size===filtApps.filter(a=>!a.is_revoked).length} onChange={e=>e.target.checked?selectAll():setSelectedApps(new Set())}/></th>
            <th onClick={()=>sortBy("name")}>App / Platform {sortCol==="name"?(sortDir>0?"↑":"↓"):""}</th>
            <th onClick={()=>sortBy("risk_score")}>{t.riskScore} {sortCol==="risk_score"?(sortDir>0?"↑":"↓"):"↓"}</th>
            <th>{t.permissionsCol}</th>
            <th onClick={()=>sortBy("users_affected")}>{t.users}</th>
            <th>Compliance</th>
            <th>{t.actions}</th>
          </tr></thead>
          <tbody>
            {filtApps.length===0
              ?<tr><td colSpan={7}><div style={{textAlign:"center",padding:"40px 24px",color:"var(--text3)",fontWeight:600}}><div style={{fontSize:32,marginBottom:10}}>🔍</div>{apps.length===0?t.noApps:"No apps match filters"}<br/><button className="btn-pri" style={{marginTop:14,padding:"8px 16px",fontSize:12}} onClick={()=>setPage("integrations")}>Connect a Platform →</button></div></td></tr>
              :filtApps.map(app=>{
                const rev=app.is_revoked, rc=rColor(app.risk_score||0);
                const perms=app.permissions||[], comp=app.compliance?.map(c=>c.framework?.name).filter(Boolean)||[];
                const isSel = selectedApps.has(app.id);
                return <tr key={app.id} className={rev?"rev":""} style={{cursor:"pointer",background:isSel?"rgba(16,185,129,.05)":""}} onClick={()=>setDetailApp(app)}>
                  <td style={{padding:"11px 12px"}} onClick={e=>e.stopPropagation()}><input type="checkbox" className="row-checkbox" checked={isSel} disabled={rev} onChange={()=>toggleSelect(app.id)}/></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div className="app-cell">
                      <div className="app-ic" style={{background:PC[app.platform?.name]||"#64748b"}}>{(app.name||"?")[0].toUpperCase()}</div>
                      <div><div className="app-nm">{app.name}{!app.verified&&<span className="unv">Unverified</span>}</div><div className="app-pl">{app.platform?.name} · {app.connection_type}</div></div>
                      {app.is_stale&&<div className="stale-dot" title="Stale"/>}
                    </div>
                  </td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div className="rbar-wrap"><div className="rbar"><div className="rbar-fill" style={{width:`${app.risk_score||0}%`,background:rc}}/></div><span style={{fontSize:13,fontWeight:800,color:rc}}>{app.risk_score||0}</span></div>
                    <span className={`sev ${SEV_CLS[app.severity]||"sev-l"}`} style={{marginTop:4,display:"inline-block"}}>{SEV_TXT[app.severity]||"Low"}</span>
                  </td>
                  <td onClick={e=>e.stopPropagation()}><div className="ptags">{perms.slice(0,3).map(p=><span key={p.id} className={`ptag ${p.is_high_risk?"ptag-r":""}`}>{p.scope}</span>)}{perms.length>3&&<span className="ptag">+{perms.length-3}</span>}</div></td>
                  <td onClick={e=>e.stopPropagation()}><span style={{fontWeight:700}}>{fmtUsers(app)}</span></td>
                  <td onClick={e=>e.stopPropagation()}><div className="cf-wrap">{comp.length?comp.map(c=><span key={c} className="cf">{c}</span>):<span className="cf cf-ok">Clear</span>}</div></td>
                  <td onClick={e=>e.stopPropagation()}><div className="act-wrap">{rev?<span style={{fontSize:10,fontWeight:600,color:"var(--text3)"}}>{t.revokedLabel}</span>:<button className="btn-rev" onClick={()=>setModal(app)}>{t.revoke}</button>}<button className="btn-rvw" onClick={()=>setDetailApp(app)}>{t.review}</button></div></td>
                </tr>;
              })
            }
          </tbody>
        </table>
      </div>
      <div className="tfoot">{t.showing} {filtApps.length} {t.of} {apps.length} {t.apps} · {t.sortedBy} {sortCol}</div>
    </div>
    );
  };

  // ── COMP PAGE ──
  const CompPage = ({ fapps, framework, shortCode, controls }) => {
    const revokedN = apps.filter(a=>a.is_revoked&&a.compliance?.some(c=>c.framework?.short_code===shortCode)).length;
    const total = fapps.length+revokedN;
    const pct = total>0?Math.round((revokedN/total)*100):(fapps.length===0?100:0);
    return <>
      <div className="comp-hero">
        {[[pct+"%",t.controlsPassing,pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444"],[fapps.length,t.appsAtRisk,"#ef4444"],[revokedN,t.risksResolved,"#10b981"],[controls.filter(c=>c.s!=="p").length,t.openFindings,"#f59e0b"]].map(([n,l,c])=>(
          <div key={l} className="comp-stat"><div className="comp-n" style={{color:c}}>{n}</div><div className="comp-l">{l}</div></div>
        ))}
      </div>
      <div className="comp-2col">
        <div className="ctrl-card">
          <div className="ctrl-hd"><span className="ctrl-hd-title">{framework} Controls</span><span style={{fontSize:12,fontWeight:700,color:pct>=80?"#10b981":"#f59e0b"}}>{pct}% passing</span></div>
          {controls.map((c,i)=><div key={i} className="ctrl-item"><div className={`cs ${c.s==="p"?"cs-p":c.s==="w"?"cs-w":"cs-f"}`}>{c.s==="p"?"✓":c.s==="w"?"!":"✗"}</div><span style={{flex:1,color:"var(--text)"}}>{c.name}</span>{c.n>0&&<span style={{fontSize:10,color:"var(--text3)"}}>{c.n} apps</span>}</div>)}
        </div>
        <div className="ctrl-card">
          <div className="ctrl-hd"><span className="ctrl-hd-title">{t.affectedApps}</span><span style={{fontSize:12,fontWeight:700,color:"#ef4444"}}>{fapps.length} at risk</span></div>
          {fapps.length===0?<div style={{padding:20,textAlign:"center",fontSize:12,color:"#10b981",fontWeight:700}}>✓ {t.noRisk} {framework}</div>:fapps.map(app=><div key={app.id} className="ctrl-item" style={{cursor:"pointer"}} onClick={()=>setDetailApp(app)}><div className={`cs ${app.severity==="critical"?"cs-f":app.severity==="high"?"cs-w":"cs-p"}`}>{app.severity==="critical"?"✗":app.severity==="high"?"!":"~"}</div><span style={{flex:1,fontWeight:600}}>{app.name}</span><button className="btn-rev" style={{fontSize:9,padding:"2px 7px"}} onClick={e=>{e.stopPropagation();setModal(app)}}>{t.revoke}</button></div>)}
        </div>
      </div>
    </>;
  };

  // ── INTEGRATIONS PAGE ──
  const IntegrationsPage = () => {
    const integrationDefs = [
      { name:"GitHub", icon:"🐙", color:"#24292e", desc:"Discover all OAuth apps and GitHub App installations connected to your organization's repositories.", scopes:["read:org","admin:app","repo"], onConnect:connectGitHub },
      { name:"Slack", icon:"💬", color:"#4A154B", desc:"Find all apps installed in your Slack workspace, including their scopes and access levels.", scopes:["apps:read","admin"], onConnect:connectSlack },
      { name:"Google Workspace", icon:"🔵", color:"#0f9d58", desc:"Scan all third-party apps connected to your Google Workspace via OAuth.", scopes:["admin.googleapis.com"], onConnect:()=>showToast("Coming soon — Google Workspace") },
      { name:"Salesforce", icon:"☁️", color:"#00A1E0", desc:"Identify Connected Apps and external OAuth integrations in your Salesforce org.", scopes:["full","api"], onConnect:()=>showToast("Coming soon — Salesforce") },
    ];

    return (
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div className="card">
          <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:6}}>{t.connectPlatforms}</div>
          <div style={{fontSize:12,color:"var(--text2)"}}>{t.connectDesc}</div>
        </div>
        <div className="int-grid">
          {integrationDefs.map(int=>{
            const connected = platforms.find(p=>p.name===int.name);
            const isScanning = scanningPlatform===int.name;
            return (
              <div key={int.name} className={`int-card ${connected?"connected":""}`}>
                <div className="int-header">
                  <div className="int-icon" style={{background:int.color+"20",fontSize:24}}>{int.icon}</div>
                  <div>
                    <div className="int-name">{int.name}</div>
                    <div className="int-type">OAuth 2.0</div>
                  </div>
                  <div className={`int-status ${connected?"on":"off"}`}>
                    <div className={`int-dot ${connected?"on":"off"}`}/>
                    {connected?t.connected:"Not connected"}
                  </div>
                </div>
                <div className="int-desc">{int.desc}</div>
                {connected&&<div className="int-meta">{t.lastSynced}: {connected.last_synced_at?new Date(connected.last_synced_at).toLocaleString():t.neverSynced}</div>}
                <div style={{display:"flex",gap:8}}>
                  {!connected
                    ?<button className="int-btn connect" onClick={int.onConnect}><Icon name="link" size={14} color="#fff"/> {int.name==="GitHub"?t.connectGithub:int.name==="Slack"?t.connectSlack:`Connect ${int.name}`}</button>
                    :<>
                      <button className={`int-btn ${isScanning?"scanning":"scan"}`} style={{flex:1}} onClick={()=>triggerScan(int.name)} disabled={isScanning}>
                        {isScanning?<><div className="spinner" style={{width:14,height:14,border:"2px solid #e2e8f0",borderTopColor:"#10b981"}}/> {t.scanning}</>:<><Icon name="check" size={14} color="#fff"/> {t.scanNow}</>}
                      </button>
                    </>
                  }
                </div>
                {connected&&<div className="int-apps-found">✓ {apps.filter(a=>a.platform?.name===int.name).length} apps found</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── PROFILE PAGE ──
  const ProfilePage = () => {
    const [pForm, setPForm] = useState({ full_name:profile?.full_name||"", role:profile?.role||"it_manager", language:lang });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [notifs, setNotifs] = useState({ weekly:true, criticalOnly:false });
    const [appearance, setAppearance] = useState({ compact:false });
    const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem(`sg-avatar-${session?.user?.id}`) || null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2MB"); return; }
      setAvatarUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setAvatarUrl(dataUrl);
        localStorage.setItem(`sg-avatar-${session?.user?.id}`, dataUrl);
        setAvatarUploading(false);
        showToast("✓ Profile photo updated!");
      };
      reader.readAsDataURL(file);
    };

    const save = async e => {
      e.preventDefault();
      setSaving(true);
      await supabase.from("profiles").update({ full_name:pForm.full_name, role:pForm.role, language:pForm.language }).eq("id", session.user.id);
      if (pForm.language!==lang) changeLang(pForm.language);
      setSaving(false); setSaved(true);
      setTimeout(()=>setSaved(false), 2500);
      load();
    };

    const initials = (profile?.full_name||session.user.email||"U")[0].toUpperCase();

    return (
      <div className="profile-grid">
        <div>
          <div className="profile-sidebar-card">
            <input
              ref={fileInputRef}
              className="avatar-upload-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <div className="profile-avatar-lg" onClick={handleAvatarClick}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar"/>
                : <span style={{position:"relative",zIndex:2}}>{initials}</span>
              }
              <div className="avatar-overlay">
                <div className="avatar-overlay-icon">{avatarUploading ? "⏳" : "📷"}</div>
                <div className="avatar-overlay-txt">{avatarUploading ? "Uploading..." : "Change photo"}</div>
              </div>
              <div className="avatar-edit">✏️</div>
            </div>
            <div className="profile-name">{profile?.full_name||"User"}</div>
            <div className="profile-role">{profile?.role||"IT Manager"}</div>
            <div className="profile-org">{org?.name||"Organization"}</div>
            <div className="profile-stats">
              <div className="pstat"><div className="pstat-n">{apps.length}</div><div className="pstat-l">Apps</div></div>
              <div className="pstat"><div className="pstat-n" style={{color:"#ef4444"}}>{critN}</div><div className="pstat-l">Critical</div></div>
              <div className="pstat"><div className="pstat-n" style={{color:"#10b981"}}>{revs.length}</div><div className="pstat-l">Revoked</div></div>
              <div className="pstat"><div className="pstat-n" style={{color:scColor(sec)}}>{sec}</div><div className="pstat-l">Score</div></div>
            </div>
            {avatarUrl && (
              <button onClick={()=>{setAvatarUrl(null);localStorage.removeItem(`sg-avatar-${session?.user?.id}`);showToast("Photo removed");}} style={{marginTop:12,fontSize:10,fontWeight:600,color:"#ef4444",background:"transparent",border:"1px solid rgba(239,68,68,.3)",borderRadius:7,padding:"4px 12px",cursor:"pointer"}}>
                Remove photo
              </button>
            )}
          </div>
        </div>
        <div className="profile-main-card">
          <form onSubmit={save}>
            <div className="section-title"><Icon name="user" size={16} color="#10b981"/> {t.profileTitle}</div>
            <div className="form-grid">
              <div className="f-group">
                <label className="f-lbl">{t.displayName}</label>
                <input className="f-inp" value={pForm.full_name} onChange={e=>setPForm(f=>({...f,full_name:e.target.value}))}/>
              </div>
              <div className="f-group">
                <label className="f-lbl">{t.role}</label>
                <select className="f-sel" value={pForm.role} onChange={e=>setPForm(f=>({...f,role:e.target.value}))}>
                  <option value="ciso">CISO — Chief Information Security Officer</option>
                  <option value="it_manager">IT Manager</option>
                  <option value="it_admin">IT Administrator</option>
                  <option value="security_analyst">Security Analyst</option>
                  <option value="security_engineer">Security Engineer</option>
                  <option value="devops_engineer">DevOps Engineer</option>
                  <option value="cloud_architect">Cloud Security Architect</option>
                  <option value="compliance_officer">Compliance Officer</option>
                  <option value="auditor">Internal Auditor</option>
                  <option value="vp_engineering">VP Engineering</option>
                  <option value="cto">CTO — Chief Technology Officer</option>
                  <option value="founder">Founder / CEO</option>
                  <option value="read_only">Read Only (Guest)</option>
                </select>
              </div>
              <div className="f-group">
                <label className="f-lbl">{t.email}</label>
                <input className="f-inp" value={session.user.email} disabled style={{background:"var(--bg3)",color:"var(--text3)",cursor:"not-allowed"}}/>
              </div>
              <div className="f-group">
                <label className="f-lbl">{t.language}</label>
                <select className="f-sel" value={pForm.language} onChange={e=>setPForm(f=>({...f,language:e.target.value}))}>
                  {Object.entries(LANG_NAMES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
              <button type="submit" className="btn-pri" style={{display:"flex",alignItems:"center",gap:7}} disabled={saving}>
                {saving?<><div className="spinner" style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff"}}/>{t.saving}</>:saved?<><Icon name="check" size={14} color="#fff"/>{t.saved}</>:t.editProfile}
              </button>
            </div>
          </form>

          <hr style={{border:"none",borderTop:"1px solid var(--border)"}}/>

          <div>
            <div className="section-title" style={{marginBottom:10}}>🔔 {t.emailNotif}</div>
            <div className="toggle-row">
              <div><div className="toggle-info">{t.weeklyReport}</div><div className="toggle-sub">Every Monday morning</div></div>
              <div className={`toggle-switch ${notifs.weekly?"on":""}`} onClick={()=>setNotifs(n=>({...n,weekly:!n.weekly}))}><div className="toggle-thumb"/></div>
            </div>
            <div className="toggle-row">
              <div><div className="toggle-info">{t.criticalOnly}</div><div className="toggle-sub">Skip medium and low alerts</div></div>
              <div className={`toggle-switch ${notifs.criticalOnly?"on":""}`} onClick={()=>setNotifs(n=>({...n,criticalOnly:!n.criticalOnly}))}><div className="toggle-thumb"/></div>
            </div>
          </div>

          <hr style={{border:"none",borderTop:"1px solid var(--border)"}}/>

          <div>
            <div className="section-title" style={{marginBottom:10}}>🎨 {t.appearance}</div>
            <div className="toggle-row">
              <div><div className="toggle-info">{darkMode?"☀️ Light mode":"🌙 Dark mode"}</div><div className="toggle-sub">Toggle display theme</div></div>
              <div className={`toggle-switch ${darkMode?"on":""}`} onClick={toggleDark}><div className="toggle-thumb"/></div>
            </div>
            <div className="toggle-row">
              <div><div className="toggle-info">{t.compactView}</div><div className="toggle-sub">Reduce spacing in tables</div></div>
              <div className={`toggle-switch ${appearance.compact?"on":""}`} onClick={()=>setAppearance(a=>({...a,compact:!a.compact}))}><div className="toggle-thumb"/></div>
            </div>
          </div>

          <hr style={{border:"none",borderTop:"1px solid var(--border)"}}/>

          <div>
            <div className="section-title" style={{marginBottom:10}}>⚠️ {t.dangerZone}</div>
            <div className="danger-zone">
              <div className="danger-title">{t.deleteAccount}</div>
              <div className="danger-sub">This will permanently delete your account and all data.</div>
              <button className="btn-danger">{t.deleteAccount}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── ADD APP PAGE ──
  const AddAppPage = () => {
    const [form, setForm] = useState({ name:"", publisher:"", platform_id: platforms[0]?.id||"", connection_type:"OAuth", risk_score:50, severity:"medium", users_affected:0, users_type:"users", verified:false, is_stale:false, notes:"" });
    const [scopes, setScopes] = useState([]);
    const [scopeInput, setScopeInput] = useState("");
    const [scopeHigh, setScopeHigh] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const setF = (k,v) => setForm(f=>({...f,[k]:v}));
    const autoSev = s => s>=70?"critical":s>=50?"high":s>=30?"medium":"low";
    const addScope = () => { if(!scopeInput.trim()) return; setScopes(s=>[...s,{scope:scopeInput.trim(),is_high_risk:scopeHigh}]); setScopeInput(""); setScopeHigh(false); };
    const submit = async e => {
      e.preventDefault();
      if (!form.name.trim()||!form.platform_id) return;
      setSubmitting(true);
      try {
        const { data:app, error } = await supabase.from("connected_apps").insert({ org_id:profile.org_id, platform_id:form.platform_id, name:form.name.trim(), publisher:form.publisher.trim()||null, verified:form.verified, connection_type:form.connection_type, risk_score:form.risk_score, severity:form.severity, users_affected:Number(form.users_affected), users_type:form.users_type, is_stale:form.is_stale, notes:form.notes.trim()||null, connected_at:new Date().toISOString(), last_active_at:new Date().toISOString() }).select().single();
        if (error) throw error;
        if (scopes.length>0) await supabase.from("app_permissions").insert(scopes.map(s=>({app_id:app.id,scope:s.scope,is_high_risk:s.is_high_risk})));
        setSuccess(true);
        setForm({ name:"", publisher:"", platform_id:platforms[0]?.id||"", connection_type:"OAuth", risk_score:50, severity:"medium", users_affected:0, users_type:"users", verified:false, is_stale:false, notes:"" });
        setScopes([]);
        load();
        setTimeout(()=>setSuccess(false), 4000);
      } catch(err) { showToast("Error: "+err.message); }
      setSubmitting(false);
    };
    const rc = rColor(form.risk_score);
    return (
      <div className="add-app-wrap">
        {success&&<div className="success-banner"><div className="success-ico">✓</div>{t.appAdded}</div>}
        <form onSubmit={submit}>
          <div className="add-app-card">
            <div className="add-app-hd"><div className="add-app-hico">+</div><div><div className="add-app-htitle">{t.addApp}</div><div className="add-app-hsub">Register a new third-party app to monitor</div></div></div>
            <div className="add-app-body">
              <div className="add-app-grid">
                <div className="aa-field"><label className="aa-label">{t.appName} *</label><input className="aa-input" type="text" placeholder="e.g. Salesforce Marketing Cloud" value={form.name} onChange={e=>setF("name",e.target.value)} required/></div>
                <div className="aa-field"><label className="aa-label">{t.appPublisher}</label><input className="aa-input" type="text" placeholder="e.g. Salesforce Inc" value={form.publisher} onChange={e=>setF("publisher",e.target.value)}/></div>
                <div className="aa-field"><label className="aa-label">{t.appPlatform} *</label><select className="aa-select" value={form.platform_id} onChange={e=>setF("platform_id",e.target.value)} required>{platforms.length===0&&<option value="">No platforms — connect first</option>}{platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="aa-field"><label className="aa-label">{t.appConnType}</label><select className="aa-select" value={form.connection_type} onChange={e=>setF("connection_type",e.target.value)}><option>OAuth</option><option>API Key</option><option>Service Account</option><option>Webhook</option></select></div>
                <div className="aa-field full"><label className="aa-label">{t.appRiskScore} — auto-sets severity</label><input className="aa-range" type="range" min="0" max="100" step="1" value={form.risk_score} onChange={e=>{const v=Number(e.target.value);setF("risk_score",v);setF("severity",autoSev(v));}}/><div className="risk-prev"><div className="risk-prev-bar"><div className="risk-prev-fill" style={{width:`${form.risk_score}%`,background:rc}}/></div><span className="risk-prev-val" style={{color:rc}}>{form.risk_score}</span><span className={`sev ${SEV_CLS[form.severity]||"sev-l"}`}>{SEV_TXT[form.severity]}</span></div></div>
                <div className="aa-field"><label className="aa-label">{t.appUsersAff}</label><input className="aa-input" type="number" min="0" value={form.users_affected} onChange={e=>setF("users_affected",e.target.value)}/></div>
                <div className="aa-field"><label className="aa-label">{t.appUsersType}</label><select className="aa-select" value={form.users_type} onChange={e=>setF("users_type",e.target.value)}><option value="users">Users</option><option value="repos">Repos</option><option value="records">Records</option></select></div>
                <div className="aa-field"><label className="aa-label">{t.appVerified}</label><div className={`aa-toggle ${form.verified?"on-g":""}`} onClick={()=>setF("verified",!form.verified)}><div className={`aa-cb ${form.verified?"on-g":""}`}>{form.verified?"✓":""}</div><span style={{fontSize:12,fontWeight:600,color:"#475569"}}>{form.verified?"Verified ✓":"Unverified"}</span></div></div>
                <div className="aa-field"><label className="aa-label">{t.appStale}</label><div className={`aa-toggle ${form.is_stale?"on-a":""}`} onClick={()=>setF("is_stale",!form.is_stale)}><div className={`aa-cb ${form.is_stale?"on-a":""}`}>{form.is_stale?"!":""}</div><span style={{fontSize:12,fontWeight:600,color:"#475569"}}>{form.is_stale?"Stale 90+ days":"Active token"}</span></div></div>
                <div className="aa-field full"><label className="aa-label">{t.appNotes}</label><textarea className="aa-input" rows={2} placeholder="Any context about this app..." value={form.notes} onChange={e=>setF("notes",e.target.value)} style={{resize:"vertical"}}/></div>
              </div>
              <hr className="aa-divider"/>
              <div>
                <label className="aa-label" style={{display:"block",marginBottom:10}}>OAuth Scopes / Permissions</label>
                <div className="scope-row">
                  <input className="aa-input" style={{flex:1}} type="text" placeholder="e.g. channels:read, repo:write" value={scopeInput} onChange={e=>setScopeInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addScope();}}}/>
                  <div className={`aa-toggle ${scopeHigh?"on-a":""}`} style={{padding:"10px 12px",flexShrink:0}} onClick={()=>setScopeHigh(v=>!v)}><div className={`aa-cb ${scopeHigh?"on-a":""}`}>{scopeHigh?"!":""}</div><span style={{fontSize:11,fontWeight:600,color:"#475569",whiteSpace:"nowrap"}}>High risk</span></div>
                  <button type="button" className="aa-submit" style={{padding:"10px 16px",flexShrink:0}} onClick={addScope}>+ Add</button>
                </div>
                <div className="scope-tags">
                  {scopes.length===0&&<span style={{fontSize:11,color:"#94a3b8",fontStyle:"italic",padding:"4px 2px"}}>No scopes yet — type above and press Enter</span>}
                  {scopes.map((s,i)=><span key={i} className={`stag ${s.is_high_risk?"stag-r":""}`}>{s.scope}<span className="stag-x" onClick={()=>setScopes(sc=>sc.filter((_,j)=>j!==i))}>×</span></span>)}
                </div>
              </div>
            </div>
            <div className="add-app-footer"><span className="aa-hint">* Required · Risk score auto-sets severity</span><button type="submit" className="aa-submit" disabled={submitting||!form.name.trim()}>{submitting?t.adding:`${t.addAppBtn} →`}</button></div>
          </div>
        </form>
      </div>
    );
  };

  // ── GUIDE PAGE ──
  const GuidePage = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div className="guide-hero">
        <div className="guide-hero-title">📖 ScopeGuard — Platform Guide</div>
        <div className="guide-hero-sub">Everything you need to know about securing your SaaS-to-SaaS connections. Understand every section, every metric, and every action available to you.</div>
      </div>
      <div className="guide-grid">

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(16,185,129,.1)"}}>🏠</div>
            <div><div className="guide-card-title">Dashboard</div><div className="guide-card-sub">Your security overview at a glance</div></div>
          </div>
          <div className="guide-desc">The Dashboard gives you an instant snapshot of your organization's SaaS security posture — no digging required.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">1</div><span><strong>Global Security Score</strong> — a 0–100 score calculated from the average risk across all connected apps. Higher = better. Aim for 70+.</span></div>
            <div className="guide-item"><div className="guide-bullet">2</div><span><strong>Connected Apps</strong> — total third-party apps discovered, broken down by Critical / High / Safe risk levels.</span></div>
            <div className="guide-item"><div className="guide-bullet">3</div><span><strong>Compliance Gaps</strong> — apps that violate SOC 2 or GDPR requirements. These need immediate attention.</span></div>
            <div className="guide-item"><div className="guide-bullet">4</div><span><strong>Stale Integrations</strong> — apps that haven't been active for 90+ days but still hold live tokens. A prime attack surface.</span></div>
          </div>
          <div className="guide-tip"><strong>Pro tip:</strong> Click any KPI card to jump directly to the filtered view of those apps.</div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(239,68,68,.1)"}}>⚠️</div>
            <div><div className="guide-card-title">Risk Score System</div><div className="guide-card-sub">How apps are scored and classified</div></div>
          </div>
          <div className="guide-desc">Every connected app receives a risk score from 0 to 100 based on the permissions it holds, how long it's been inactive, and whether the publisher is verified.</div>
          <div className="guide-risk-row">
            <div className="risk-pill c">🔴 Critical 70–100</div>
            <div className="risk-pill h">🟡 High 50–69</div>
            <div className="risk-pill m">🔵 Medium 30–49</div>
            <div className="risk-pill l">🟢 Low 0–29</div>
          </div>
          <div className="guide-items" style={{marginTop:12}}>
            <div className="guide-item"><div className="guide-bullet">↑</div><span>Admin, repo:write, channels:history → add 20–25 points each</span></div>
            <div className="guide-item"><div className="guide-bullet">↑</div><span>Unverified publisher → adds 15 points</span></div>
            <div className="guide-item"><div className="guide-bullet">↑</div><span>Stale token (90+ days) → adds 10 points</span></div>
          </div>
          <div className="guide-tip"><strong>Action:</strong> Any app scoring 70+ should be reviewed immediately. Revoke if there's no clear business justification.</div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(59,130,246,.1)"}}>📋</div>
            <div><div className="guide-card-title">App Inventory</div><div className="guide-card-sub">Your single pane of glass</div></div>
          </div>
          <div className="guide-desc">The complete list of every third-party app connected to your platforms. Use filters and sorting to quickly find the most dangerous apps.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">🔍</div><span><strong>Search</strong> by app name or platform to find specific integrations</span></div>
            <div className="guide-item"><div className="guide-bullet">🔴</div><span><strong>Critical filter</strong> — shows only apps scoring 70+ that need immediate action</span></div>
            <div className="guide-item"><div className="guide-bullet">⏱</div><span><strong>Stale filter</strong> — apps with no activity in 90+ days. Safe to revoke in most cases.</span></div>
            <div className="guide-item"><div className="guide-bullet">📎</div><span><strong>Compliance filters</strong> — show only apps affecting your SOC 2 or GDPR audit scope</span></div>
            <div className="guide-item"><div className="guide-bullet">👆</div><span><strong>Click any row</strong> to open the full detail panel with permissions, activity log, and revoke button</span></div>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(245,158,11,.1)"}}>🚨</div>
            <div><div className="guide-card-title">Critical Alerts</div><div className="guide-card-sub">Issues that need your attention now</div></div>
          </div>
          <div className="guide-desc">Alerts are automatically generated when ScopeGuard detects a dangerous condition. They are prioritized by severity.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">🔴</div><span><strong>Critical</strong> — unverified app with broad access, or admin-level token that's been unused for weeks</span></div>
            <div className="guide-item"><div className="guide-bullet">🟡</div><span><strong>High</strong> — overpermissioned app, no DPA on file for a vendor with PII access, or stale token</span></div>
            <div className="guide-item"><div className="guide-bullet">🔵</div><span><strong>Medium</strong> — app requesting more scopes than its stated purpose requires</span></div>
          </div>
          <div className="guide-items" style={{marginTop:10}}>
            <div className="guide-item"><div className="guide-bullet">✓</div><span><strong>Revoke</strong> — immediately disconnects the app and logs the action in the Revocation Log</span></div>
            <div className="guide-item"><div className="guide-bullet">✗</div><span><strong>Dismiss</strong> — marks the alert as acknowledged. Use this if you've verified the app is legitimate.</span></div>
          </div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(139,92,246,.1)"}}>🔗</div>
            <div><div className="guide-card-title">Integrations</div><div className="guide-card-sub">Connect your real platforms</div></div>
          </div>
          <div className="guide-desc">Connect your SaaS platforms to enable automatic discovery. Once connected, ScopeGuard will scan and find all third-party apps — no manual entry needed.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">🐙</div><span><strong>GitHub</strong> — discovers OAuth apps and GitHub App installations across your org's repos</span></div>
            <div className="guide-item"><div className="guide-bullet">💬</div><span><strong>Slack</strong> — finds all apps installed in your workspace with their scopes</span></div>
            <div className="guide-item"><div className="guide-bullet">🔵</div><span><strong>Google Workspace</strong> — scans all third-party apps connected via OAuth (coming soon)</span></div>
            <div className="guide-item"><div className="guide-bullet">☁️</div><span><strong>Salesforce</strong> — identifies Connected Apps in your org (coming soon)</span></div>
          </div>
          <div className="guide-tip"><strong>How it works:</strong> Click "Connect" → authorize via OAuth → ScopeGuard scans immediately and saves all discovered apps to your database.</div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(16,185,129,.1)"}}>🛡️</div>
            <div><div className="guide-card-title">Compliance (SOC 2 & GDPR)</div><div className="guide-card-sub">Meet your audit requirements</div></div>
          </div>
          <div className="guide-desc">ScopeGuard maps your app risks to specific compliance controls so you can prove to auditors that you're actively managing third-party access.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">✓</div><span><strong>SOC 2 CC6.x</strong> — logical access controls, user provisioning, vendor risk management</span></div>
            <div className="guide-item"><div className="guide-bullet">✓</div><span><strong>GDPR Art. 28</strong> — processor contracts (DPA). If a vendor has PII access, a DPA must be in place.</span></div>
            <div className="guide-item"><div className="guide-bullet">✓</div><span><strong>GDPR Art. 25</strong> — data protection by design. Apps should only have the minimum permissions needed.</span></div>
          </div>
          <div className="guide-tip"><strong>For auditors:</strong> Export the compliance report as PDF — it shows exactly which controls are passing, which apps are affected, and when risks were remediated.</div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(239,68,68,.1)"}}>⛔</div>
            <div><div className="guide-card-title">Revoking Access</div><div className="guide-card-sub">How to disconnect a dangerous app</div></div>
          </div>
          <div className="guide-desc">Revoking an app immediately terminates its OAuth token or API key. The app can no longer access your data. The action is logged with a timestamp for audit purposes.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">1</div><span>Find the app in <strong>App Inventory</strong> or <strong>Critical Alerts</strong></span></div>
            <div className="guide-item"><div className="guide-bullet">2</div><span>Click <strong>Revoke</strong> — a confirmation dialog appears</span></div>
            <div className="guide-item"><div className="guide-bullet">3</div><span>Confirm the revocation — the app is immediately disconnected</span></div>
            <div className="guide-item"><div className="guide-bullet">4</div><span>The action is saved in <strong>Revocation Log</strong> with who did it and when</span></div>
          </div>
          <div className="guide-tip"><strong>Important:</strong> Revoking from ScopeGuard logs the action, but for full removal you should also revoke directly in the source platform (GitHub settings, Slack admin, etc.).</div>
        </div>

        <div className="guide-card">
          <div className="guide-card-header">
            <div className="guide-icon" style={{background:"rgba(16,185,129,.1)"}}>➕</div>
            <div><div className="guide-card-title">Add App Manually</div><div className="guide-card-sub">For apps not yet auto-discovered</div></div>
          </div>
          <div className="guide-desc">While automatic scanning via API is the primary method, you can manually add apps you already know about before connecting a platform.</div>
          <div className="guide-items">
            <div className="guide-item"><div className="guide-bullet">📝</div><span>Enter the <strong>app name, publisher, platform</strong> and connection type</span></div>
            <div className="guide-item"><div className="guide-bullet">🎚</div><span>Set the <strong>risk score</strong> (0–100) — severity is auto-calculated</span></div>
            <div className="guide-item"><div className="guide-bullet">🔑</div><span>Add <strong>OAuth scopes</strong> the app holds — mark high-risk ones for visibility</span></div>
            <div className="guide-item"><div className="guide-bullet">✅</div><span>Mark as <strong>Verified</strong> if the publisher is a known, trusted vendor</span></div>
          </div>
          <div className="guide-tip"><strong>Best practice:</strong> Connect your platforms first (Integrations page) — ScopeGuard will auto-discover everything and you won't need manual entry.</div>
        </div>

      </div>
    </div>
  );

  // ── ONBOARDING ──
  const OnboardingModal = () => {
    const steps = [
      { ico:"🔗", title:"Connect GitHub", sub:"Discover OAuth apps in your repos", done: platforms.some(p=>p.name==="GitHub") },
      { ico:"💬", title:"Connect Slack", sub:"Find all apps in your workspace", done: platforms.some(p=>p.name==="Slack") },
      { ico:"🔍", title:"Run your first scan", sub:"Discover all connected apps", done: apps.length > 0 },
      { ico:"🛡️", title:"Review critical risks", sub:"Check apps that need attention", done: alerts.length === 0 || revs.length > 0 },
    ];
    const doneCount = steps.filter(s=>s.done).length;
    const pct = Math.round((doneCount/steps.length)*100);

    return (
      <div className="onboard-wrap" onClick={e=>{if(e.target===e.currentTarget){setShowOnboarding(false);localStorage.setItem("sg-onboarded","1");setOnboardDone(true)}}}>
        <div className="onboard-card">
          <div className="onboard-logo">
            <svg viewBox="0 0 44 44" fill="none" width="44" height="44">
              <defs><linearGradient id="og1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#34d399"/></linearGradient></defs>
              <rect x="1" y="1" width="42" height="42" rx="12" fill="#0e0d1f" stroke="url(#og1)" strokeWidth="1"/>
              <path d="M22 6L8 12v10c0 9 6 16 14 18 8-2 14-9 14-18V12Z" fill="none" stroke="url(#og1)" strokeWidth="1.8"/>
              <path d="M14 20c0-4 16-4 16 0s-16 4-16 8 16 4 16 0" stroke="url(#og1)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="onboard-title">Welcome to ScopeGuard 👋</div>
          <div className="onboard-sub">Let's secure your SaaS stack in 4 simple steps. This takes less than 2 minutes.</div>
          <div className="onboard-progress"><div className="onboard-progress-fill" style={{width:`${pct}%`}}/></div>
          <div className="onboard-steps">
            {steps.map((s,i) => (
              <div key={i} className={`onboard-step ${s.done?"done":i===doneCount?"active":""}`}
                onClick={()=>{ if(i===0){connectGitHub()} else if(i===1){connectSlack()} else{setShowOnboarding(false);setPage(i===2?"integrations":"alerts")} }}>
                <div className="onboard-step-ico" style={{background:s.done?"rgba(16,185,129,.1)":i===doneCount?"rgba(167,139,250,.1)":"var(--bg3)"}}>{s.ico}</div>
                <div className="onboard-step-body">
                  <div className="onboard-step-title">{s.title}</div>
                  <div className="onboard-step-sub">{s.sub}</div>
                </div>
                <div className="onboard-step-status" style={{color:s.done?"#10b981":i===doneCount?"#a78bfa":"var(--text3)"}}>
                  {s.done ? "✓ Done" : i===doneCount ? "→" : ""}
                </div>
              </div>
            ))}
          </div>
          {doneCount === steps.length
            ? <button className="btn-pri" style={{width:"100%",padding:13,fontSize:14}} onClick={()=>{setShowOnboarding(false);localStorage.setItem("sg-onboarded","1");setOnboardDone(true)}}>🎉 All done — go to dashboard</button>
            : <button className="onboard-skip" onClick={()=>{setShowOnboarding(false);localStorage.setItem("sg-onboarded","1");setOnboardDone(true)}}>Skip for now</button>
          }
        </div>
      </div>
    );
  };

  // ── RISK TIMELINE ──
  const RiskTimeline = () => {
    const hist = scoreHistory.length > 1 ? scoreHistory : [
      ...scoreHistory,
      { date: new Date(Date.now()-86400000*2).toISOString().split("T")[0], score: Math.max(10, sec-8) },
      { date: new Date(Date.now()-86400000).toISOString().split("T")[0], score: Math.max(10, sec-3) },
    ].sort((a,b)=>a.date.localeCompare(b.date));

    const maxS = Math.max(...hist.map(h=>h.score), 100);
    const minS = Math.max(0, Math.min(...hist.map(h=>h.score)) - 10);
    const w = 100 / Math.max(hist.length - 1, 1);

    const pts = hist.map((h,i) => {
      const x = i * w;
      const y = 100 - ((h.score - minS) / (maxS - minS)) * 80 - 10;
      return `${x},${y}`;
    }).join(" ");

    const fillPts = `0,100 ${pts} 100,100`;

    return (
      <div className="timeline-card">
        <div className="timeline-header">
          <div className="timeline-title">📈 Security Score Timeline</div>
          <div className="timeline-legend">
            <span><span className="timeline-legend-dot" style={{background:"#10b981"}}/>Score trend</span>
          </div>
        </div>
        <svg width="100%" height="120" viewBox="0 0 100 100" preserveAspectRatio="none" style={{display:"block"}}>
          <defs>
            <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity=".3"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <polygon points={fillPts} fill="url(#tg1)"/>
          <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
          {hist.map((h,i) => {
            const x = i * w;
            const y = 100 - ((h.score - minS) / (maxS - minS)) * 80 - 10;
            return <circle key={i} cx={x} cy={y} r="1.5" fill="#10b981" vectorEffect="non-scaling-stroke"/>;
          })}
        </svg>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text3)",marginTop:4}}>
          {hist.length > 1 && <span>{hist[0]?.date}</span>}
          <span style={{color:scColor(sec),fontWeight:700}}>Current: {sec}/100</span>
          {hist.length > 1 && <span>{hist[hist.length-1]?.date}</span>}
        </div>
      </div>
    );
  };

  // ── NOTIFICATIONS PAGE ──
  const NotificationsPage = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:680}}>
      <div className="card">
        <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:4}}>🔔 Alert Notifications</div>
        <div style={{fontSize:12,color:"var(--text2)"}}>Get notified instantly when ScopeGuard detects a critical risk or new app.</div>
      </div>
      <div className="notif-card">
        <div className="notif-row">
          <div className="notif-ico" style={{background:"rgba(239,68,68,.1)"}}>📧</div>
          <div className="notif-body">
            <div className="notif-title">Email Alerts</div>
            <div className="notif-sub">Receive critical alerts directly to your email</div>
            <input className="notif-inp" type="email" placeholder="your@company.com" value={notifEmail} onChange={e=>setNotifEmail(e.target.value)}/>
          </div>
        </div>
        <div className="notif-row">
          <div className="notif-ico" style={{background:"rgba(74,21,75,.2)"}}>💬</div>
          <div className="notif-body">
            <div className="notif-title">Slack Webhook</div>
            <div className="notif-sub">Post alerts to a Slack channel automatically</div>
            <input className="notif-inp" type="url" placeholder="https://hooks.slack.com/services/..." value={notifSlackUrl} onChange={e=>setNotifSlackUrl(e.target.value)}/>
            <div style={{fontSize:10,color:"var(--text3)",marginTop:6}}>
              Create a webhook at api.slack.com/apps → Incoming Webhooks
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Notification triggers</div>
        {[
          ["🔴","New critical app discovered","Send immediately"],
          ["🟡","Stale token detected (90+ days)","Daily digest"],
          ["📋","Compliance gap identified","Weekly report"],
          ["✅","Scan completed","Optional"],
        ].map(([ico,lbl,freq])=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border2)"}}>
            <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
            <span style={{flex:1,fontSize:12,fontWeight:600,color:"var(--text)"}}>{lbl}</span>
            <span style={{fontSize:10,color:"var(--text3)",background:"var(--bg3)",padding:"3px 8px",borderRadius:6,border:"1px solid var(--border)"}}>{freq}</span>
            <div className={`toggle-switch on`} style={{flexShrink:0}}><div className="toggle-thumb"/></div>
          </div>
        ))}
      </div>
      <button className="btn-pri" style={{alignSelf:"flex-start",padding:"10px 24px"}} onClick={saveNotifSettings}>Save notification settings</button>
    </div>
  );

  // ── PAGE CONTENT ──
  const PageContent = () => {
    if (busy) return <div style={{textAlign:"center",padding:60}}><div className="spinner-dark"/></div>;

    if (page==="dashboard") return <>
      <div className="kpi-row">
        <div className="kpi" onClick={()=>setPage("inventory")}>
          <div className="kpi-lbl">{t.globalScore}</div>
          <div className="ring-wrap">
            <div className="ring">
              <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="none" stroke="#f1f5f9" strokeWidth="5"/><circle cx="25" cy="25" r="20" fill="none" stroke={scColor(sec)} strokeWidth="5" strokeDasharray={`${filled.toFixed(1)} ${(perim-filled).toFixed(1)}`} strokeDashoffset="31" strokeLinecap="round" transform="rotate(-90 25 25)" style={{transition:"stroke-dasharray .8s cubic-bezier(.4,0,.2,1)"}}/></svg>
              <div className="ring-in"><span className="ring-grade">{grade(sec)}</span><span className="ring-lbl">Score</span></div>
            </div>
            <div><div className="kpi-val" style={{color:scColor(sec)}}>{sec}<span style={{fontSize:14,fontWeight:500,color:"#94a3b8"}}>/100</span></div><div className="kpi-sub" style={{color:sec>=60?"#10b981":"#ef4444"}}>{sec>=60?"↑ Good posture":"↓ Needs attention"}</div></div>
          </div>
        </div>
        <div className="kpi" onClick={()=>setPage("inventory")}>
          <div className="kpi-lbl">{t.connectedApps}</div>
          <div className="kpi-val">{active.length}</div>
          <div className="dbar-list">
            {[[t.filterCritical,critN,"#ef4444"],[t.filterHigh,highN,"#f59e0b"],["Safe",safeN,"#10b981"]].map(([l,n,c])=>(
              <div key={l} className="dbar"><span className="dbar-lbl" style={{color:c}}>{l}</span><div className="dbar-track"><div className="dbar-fill" style={{width:active.length>0?`${Math.round((n/active.length)*100)}%`:"0%",background:c}}/></div><span className="dbar-n" style={{color:c}}>{n}</span></div>
            ))}
          </div>
        </div>
        <div className="kpi" onClick={()=>setPage("soc2")}>
          <div className="kpi-lbl">{t.complianceGaps}</div>
          <div className="kpi-val" style={{color:compGaps>0?"#f59e0b":"#10b981"}}>{compGaps}</div>
          <div className="kpi-sub">apps affect SOC 2 or GDPR</div>
          <div className="comp-chips"><span className="cf">SOC 2 · {socApps.length}</span><span className="cf">GDPR · {gdprApps.length}</span></div>
        </div>
        <div className="kpi" onClick={()=>{setPage("inventory");setFsStale(true)}}>
          <div className="kpi-lbl">{t.staleIntegrations}</div>
          <div className="kpi-val" style={{color:staleN>0?"#f59e0b":"#10b981"}}>{staleN}</div>
          <div className="kpi-sub" style={{color:staleN>0?"#ef4444":"#94a3b8"}}>{staleN>0?"No activity > 90 days":"All integrations active"}</div>
        </div>
      </div>
      <div className="mid-row">
        <div className="card">
          <div className="card-hd"><span className="card-title">{t.criticalAlerts}</span><span className="card-link" onClick={()=>setPage("alerts")}>{t.viewAll} →</span></div>
          {alerts.length===0?<div style={{textAlign:"center",padding:16,fontSize:12,fontWeight:700,color:"#10b981"}}>✓ {t.noAlerts}</div>:alerts.slice(0,4).map(a=>{const app=apps.find(x=>x.id===a.app_id);return <div key={a.id} className="al-item"><div className="al-ico" style={{background:a.severity==="critical"?"#fee2e2":"#fef3c7"}}>{a.severity==="critical"?"⚠":"!"}</div><div className="al-body"><div className="al-ttl">{a.title}</div><div className="al-meta">{app?.name} · {a.compliance_ref}</div><div className="al-acts"><button className="btn-rev" onClick={()=>setModal(app)}>{t.revoke}</button><button className="btn-rvw" onClick={()=>dismissAlert(a.id)}>{t.dismiss}</button></div></div><span className={`sev ${SEV_CLS[a.severity]||"sev-l"}`}>{SEV_TXT[a.severity]}</span></div>;})}
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">{t.sensitiveAccess}</span><span className="card-link" onClick={()=>setPage("permissions")}>Details →</span></div>
          {[["Email / inbox",.72,"#ef4444"],["Channels / messages",.61,"#ef4444"],["File storage",.50,"#f59e0b"],["Admin / IAM",.40,"#f59e0b"],["Calendar / contacts",.30,"#3b82f6"],["Code / repos",.22,"#10b981"]].map(([l,p,c])=>(
            <div key={l} className="pbar"><span className="pbar-lbl">{l}</span><div className="pbar-track"><div className="pbar-fill" style={{width:`${p*100}%`,background:c}}/></div><span className="pbar-n">{Math.round(active.length*p)}</span></div>
          ))}
        </div>
      </div>
      <AppTable/>
      {scoreHistory.length > 0 && <RiskTimeline/>}
    </>;

    if (page==="inventory") return <AppTable/>;
    if (page==="add_app") return <AddAppPage/>;
    if (page==="integrations") return <IntegrationsPage/>;
    if (page==="profile") return <ProfilePage/>;
    if (page==="guide") return <GuidePage/>;
    if (page==="notifications") return <NotificationsPage/>;

    if (page==="alerts") return <div className="alerts-list">
      {alerts.length===0?<div className="empty-st"><div className="empty-ico">✅</div><strong>All clear!</strong>{t.noAlerts}</div>:alerts.map(a=>{const app=apps.find(x=>x.id===a.app_id);return <div key={a.id} className={`alert-card ${a.severity==="critical"?"crit":a.severity==="high"?"high":"med"}`}><div className="ac-row"><div className="ac-ico" style={{background:a.severity==="critical"?"#fee2e2":"#fef3c7"}}>{a.severity==="critical"?"⚠":"!"}</div><div className="ac-body"><div className="ac-hd"><span className="ac-name">{a.title}</span><span className={`sev ${SEV_CLS[a.severity]||"sev-l"}`}>{SEV_TXT[a.severity]}</span></div><div className="ac-detail">{a.detail||`Detected on ${app?.name||"unknown app"}`}</div><div className="ac-tags">{(a.tags||[]).map(tag=><span key={tag} className="ac-tag">{tag}</span>)}{a.compliance_ref&&<span className="ac-tag ac-tag-c">{a.compliance_ref}</span>}</div><div className="ac-acts"><button className="btn-rev" onClick={()=>setModal(app)}>{t.revoke}</button><button className="btn-rvw" onClick={()=>dismissAlert(a.id)}>{t.dismiss}</button>{app&&<button className="btn-rvw" onClick={()=>setDetailApp(app)}>{t.review}</button>}</div></div></div></div>;})}
    </div>;

    if (page==="permissions") return <>
      <div className="pm-wrap">
        <div className="pm-row" style={{gridTemplateColumns:`200px repeat(${permCols.length},1fr)`}}>
          <div className="pm-head" style={{textAlign:"left",paddingLeft:16}}>App</div>
          {permCols.map(c=><div key={c} className="pm-head">{c}</div>)}
        </div>
        {active.length===0?<div style={{padding:24,textAlign:"center",color:"#94a3b8",fontSize:12,fontWeight:600}}>{t.noApps}</div>:active.slice(0,14).map(app=>(
          <div key={app.id} className="pm-row" style={{gridTemplateColumns:`200px repeat(${permCols.length},1fr)`,cursor:"pointer"}} onClick={()=>setDetailApp(app)}>
            <div className="pm-app"><div style={{width:20,height:20,borderRadius:5,background:PC[app.platform?.name]||"#64748b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:800,flexShrink:0}}>{(app.name||"?")[0]}</div><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{app.name}</span></div>
            {permCols.map((_,i)=>{const has=hasP(app,i),risky=has&&(app.permissions||[]).some(p=>p.is_high_risk);return <div key={i} className="pm-cell"><div className="pm-dot" style={{background:has?(risky?"#ef4444":"#f59e0b"):"#e2e8f0"}}/></div>;})}
          </div>
        ))}
      </div>
      <div className="perm-leg">{[["#ef4444",t.highRisk],["#f59e0b",t.activePerm],["#e2e8f0",t.notGranted]].map(([c,l])=><span key={l}><span className="leg-dot" style={{background:c,border:c==="#e2e8f0"?"1px solid #cbd5e1":"none"}}/>{l}</span>)}</div>
    </>;

    if (page==="revocations") return <div className="rev-list">
      {revs.length===0?<div className="empty-st"><div className="empty-ico">🛡️</div><strong>No revocations yet</strong>{t.noRevocations}</div>:revs.map(r=><div key={r.id} className="rev-item"><div className="rev-ic">✓</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{r.app_name} — Access Revoked</div><div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{r.platform} · By {r.performed_by===session.user.id?"you":"team"}</div></div><div style={{fontSize:10,color:"var(--text3)",whiteSpace:"nowrap"}}>{r.performed_at?new Date(r.performed_at).toLocaleString():"Just now"}</div></div>)}
    </div>;

    if (page==="soc2") return <CompPage fapps={socApps} framework="SOC 2" shortCode="soc2" controls={[{name:"CC6.1 — Logical access controls",s:socApps.some(a=>a.severity==="critical")?"f":"w",n:socApps.filter(a=>["critical","high"].includes(a.severity)).length},{name:"CC6.3 — Remove access on termination",s:socApps.some(a=>a.is_stale)?"w":"p",n:socApps.filter(a=>a.is_stale).length},{name:"CC6.6 — Restrict to authorized users",s:socApps.some(a=>!a.verified)?"f":"p",n:socApps.filter(a=>!a.verified).length},{name:"CC7.1 — Detect & monitor components",s:socApps.length>2?"w":"p",n:socApps.length},{name:"CC9.2 — Vendor / third-party risk",s:socApps.length>3?"f":"w",n:socApps.length},{name:"CC6.2 — User provisioning controls",s:"p",n:0}]}/>;

    if (page==="gdpr") return <CompPage fapps={gdprApps} framework="GDPR" shortCode="gdpr" controls={[{name:"Art. 5 — Principles of data processing",s:gdprApps.some(a=>a.severity==="critical")?"f":"w",n:gdprApps.length},{name:"Art. 25 — Data protection by design",s:gdprApps.some(a=>(a.permissions||[]).some(p=>p.scope?.includes("contact")))?"f":"p",n:gdprApps.filter(a=>(a.permissions||[]).some(p=>p.scope?.includes("contact"))).length},{name:"Art. 28 — Processor contracts (DPA)",s:gdprApps.some(a=>a.users_type==="records")?"f":"p",n:gdprApps.filter(a=>a.users_type==="records").length},{name:"Art. 32 — Security of processing",s:gdprApps.length>1?"w":"p",n:gdprApps.length},{name:"Art. 33 — Breach notification readiness",s:"p",n:0},{name:"Art. 6 — Lawful basis for processing",s:gdprApps.length>0?"w":"p",n:gdprApps.length}]}/>;

    return null;
  };

  // ── MAIN RENDER ──
  return (
    <><style>{CSS}</style>
    <div className={`shell ${t.dir==="rtl"?"rtl-layout":"ltr-layout"}`} dir={t.dir}>
      <aside className="sidebar">
        <div className="sb-brand">
          {isDemo && (
            <div style={{position:"absolute",top:0,left:0,right:0,background:"linear-gradient(90deg,#a78bfa,#10b981)",height:3,zIndex:10}}/>
          )}
          <div className="sb-logo" onClick={()=>setShowLanding(true)} style={{cursor:"pointer"}} title="Back to home">
            <svg viewBox="0 0 38 38" fill="none" width="38" height="38">
              <defs>
                <linearGradient id="lc1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="50%" stopColor="#10b981"/>
                  <stop offset="100%" stopColor="#34d399"/>
                </linearGradient>
                <linearGradient id="lc2" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1a0a2e"/>
                  <stop offset="100%" stopColor="#0a1e14"/>
                </linearGradient>
              </defs>
              <rect x="1" y="1" width="36" height="36" rx="10" fill="#0e0d1f" stroke="url(#lc1)" strokeWidth=".8" strokeOpacity=".5"/>
              <rect x="3" y="3" width="32" height="32" rx="8" fill="url(#lc2)" opacity=".9"/>
              <path d="M19 4 L8 9 L8 19 C8 27 13 33 19 35 C25 33 30 27 30 19 L30 9 Z" fill="none" stroke="url(#lc1)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M13 14 C13 11 25 11 25 14 C25 17 13 17 13 20 C13 23 25 23 25 20" stroke="url(#lc1)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <circle cx="13" cy="14" r="1.5" fill="#a78bfa"/>
              <circle cx="25" cy="20" r="1.5" fill="#34d399"/>
            </svg>
          </div>
          <div style={{cursor:"pointer"}} onClick={()=>setShowLanding(true)}>
            <div className="sb-bname">ScopeGuard</div>
            <div className="sb-tagline">Know every app. Trust every connection.</div>
          </div>
        </div>
        <div className="sb-inner">
          <nav className="sb-nav">
            <div className="sb-sec">{t.monitor}</div>
            {[["dashboard",t.dashboard,"dashboard",critN],["inventory",t.inventory,"apps",critN],["alerts",t.alerts,"alert",alerts.length]].map(([k,lbl,ico,badge])=>(
              <div key={k} className={`sb-link ${page===k?"active":""}`} onClick={()=>setPage(k)}>
                <Icon name={ico} size={15} className="sb-icon"/>{lbl}{badge>0&&<span className="sb-badge">{badge}</span>}
              </div>
            ))}
            <div className="sb-sec">{t.manage}</div>
            {[["add_app",t.addApp,"plus",0],["permissions",t.permissions,"lock",0],["revocations",t.revocations,"history",revs.length],["integrations",t.integrations,"link",0]].map(([k,lbl,ico,badge])=>(
              <div key={k} className={`sb-link ${page===k?"active":""}`} onClick={()=>setPage(k)}>
                <Icon name={ico} size={15} className="sb-icon"/>{lbl}{badge>0&&<span className="sb-badge">{badge}</span>}
              </div>
            ))}
            <div className="sb-sec">{t.compliance}</div>
            {[["soc2","SOC 2","lock"],["gdpr","GDPR","lock"]].map(([k,lbl,ico])=>(
              <div key={k} className={`sb-link ${page===k?"active":""}`} onClick={()=>setPage(k)}><Icon name={ico} size={15} className="sb-icon"/>{lbl}</div>
            ))}
            <div className="sb-sec">{t.settings}</div>
            <div className={`sb-link ${page==="profile"?"active":""}`} onClick={()=>setPage("profile")}><Icon name="user" size={15} className="sb-icon"/>{t.profile}</div>
            <div className={`sb-link ${page==="notifications"?"active":""}`} onClick={()=>setPage("notifications")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sb-icon"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              Notifications
            </div>
            <div className={`sb-link ${page==="guide"?"active":""}`} onClick={()=>setPage("guide")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sb-icon"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Platform Guide
            </div>
          </nav>
          <div style={{flex:1}}/>
          <div className="sb-dm-row" onClick={toggleDark}>
            <span className="sb-dm-lbl">{darkMode?"☀️ Light mode":"🌙 Dark mode"}</span>
            <div className={`dm-track ${darkMode?"on":""}`}><div className="dm-thumb"/></div>
          </div>
          <div className="sb-lang">
            <div className="sb-lang-lbl">{t.language}</div>
            <div className="lang-grid">{Object.entries(LANG_NAMES).map(([k,v])=><button key={k} className={`lang-btn ${lang===k?"active":""}`} onClick={()=>changeLang(k)}>{v}</button>)}</div>
          </div>
        </div>
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-av" onClick={()=>setPage("profile")} style={{overflow:"hidden",padding:0,flexShrink:0}}>
              {(() => {
                const av = localStorage.getItem(`sg-avatar-${session?.user?.id}`);
                return av
                  ? <img src={av} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>
                  : <span style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>{(profile?.full_name||session.user.email||"U")[0].toUpperCase()}</span>;
              })()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sb-uname" onClick={()=>setPage("profile")}>{profile?.full_name||session.user.email}</div>
              <div className="sb-urole">{profile?.role||"it_manager"}</div>
            </div>
            <button className="sb-out" onClick={doSignOut}>{t.signOut}</button>
          </div>
        </div>
      </aside>

      <div className="content">
        <div className="topbar" style={{position:"relative"}}>
          {isDemo && (
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#a78bfa,#10b981,#a78bfa)",backgroundSize:"200% 100%",animation:"shimmerBrand 2s linear infinite"}}/>
          )}
          <div className="tb-l">
            <div className="tb-title">{pageTitles[page]||page}</div>
            <div className="tb-sub">
              <span className="tb-pulse"/>
              {isDemo
                ? <><span style={{background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",borderRadius:6,padding:"1px 6px",color:"#a78bfa",fontWeight:700,fontSize:9,flexShrink:0}}>DEMO</span><span style={{color:"#10b981",cursor:"pointer",fontWeight:700,fontSize:10,marginLeft:6}} onClick={doSignOut}>Create account →</span></>
                : `${t.lastScan}: ${scanMin} ${t.minsAgo}`
              }
            </div>
          </div>
          <div className="tb-r">
            <button className="btn-sec" onClick={()=>setShowLanding(true)} style={{fontSize:12,display:"flex",alignItems:"center",gap:5}}>
              🏠<span className="hide-mobile"> Home</span>
            </button>
            <button className="btn-sec hide-mobile" onClick={toggleDark} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button className="btn-sec hide-mobile" onClick={exportPDF} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}>
              📄 {t.exportPdf}
            </button>
            <button className="btn-sec hide-mobile" onClick={()=>setShowOnboarding(true)} style={{fontSize:12}}>
              🚀 Setup
            </button>
            <button className="btn-pri" onClick={doScan} disabled={scanning} style={{fontSize:12,padding:"7px 16px"}}>{scanning?"...":t.runScan}</button>
          </div>
        </div>
        <div className="scroll-area"><PageContent/></div>
      </div>

      {/* DETAIL PANEL */}
      <div className={`dp ${detailApp?"open":""}`}>
        {detailApp&&<>
          <div className="dp-hd"><div className="dp-title">{detailApp.name}</div><button className="dp-cls" onClick={()=>setDetailApp(null)}>×</button></div>
          <div className="dp-body">
            <span className={`sev ${SEV_CLS[detailApp.severity]||"sev-l"}`}>{SEV_TXT[detailApp.severity]} Risk · {detailApp.risk_score}/100</span>
            <div>{[[t.platform,detailApp.platform?.name],[t.connection,detailApp.connection_type],[t.verified,detailApp.verified?"Yes ✓":"No ⚠"],[t.lastActive,detailApp.last_active_at?new Date(detailApp.last_active_at).toLocaleDateString():"Unknown"],[t.connected,new Date(detailApp.connected_at).toLocaleDateString()],[t.users,fmtUsers(detailApp)],["Publisher",detailApp.publisher||"Unknown"]].map(([l,v])=><div key={l} className="dp-row"><span className="dp-lbl">{l}</span><span className="dp-val">{v}</span></div>)}</div>
            <div><div className="dp-sec">{t.permissionsCol}</div><div className="ptags">{(detailApp.permissions||[]).map(p=><span key={p.id} className={`ptag ${p.is_high_risk?"ptag-r":""}`}>{p.scope}</span>)}{(!detailApp.permissions||!detailApp.permissions.length)&&<span style={{fontSize:11,color:"#94a3b8"}}>No permissions recorded</span>}</div></div>
            <div><div className="dp-sec">{t.activityLog}</div><div className="dp-log"><div className="dp-li r">Risk: {detailApp.risk_score}/100 — {SEV_TXT[detailApp.severity]}</div><div className="dp-li a">Connected via {detailApp.connection_type} to {detailApp.platform?.name}</div><div className="dp-li g">First seen: {new Date(detailApp.connected_at).toLocaleDateString()}</div>{detailApp.is_stale&&<div className="dp-li r">⚠ Token stale — no activity 90+ days</div>}{!detailApp.verified&&<div className="dp-li r">⚠ Publisher unverified</div>}</div></div>
            {detailApp.notes&&<div><div className="dp-sec">Notes</div><div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{detailApp.notes}</div></div>}
            {!detailApp.is_revoked?<button className="mbtn-r" style={{width:"100%",borderRadius:10,padding:11,fontSize:13}} onClick={()=>setModal(detailApp)}>{t.revokeAccess}</button>:<div style={{fontSize:12,fontWeight:700,color:"#10b981",textAlign:"center",padding:10,background:"#d1fae5",borderRadius:9}}>✓ {t.accessRevoked}</div>}
          </div>
        </>}
      </div>
    </div>

    {modal&&<div className="modal-ov"><div className="modal-box"><div className="modal-title">{t.revokeTitle}</div><div className="modal-body">{(t.revokeBody||"").replace("{app}",modal?.name||"").replace("{platform}",modal?.platform?.name||"")}</div><div className="modal-btns"><button className="mbtn-c" onClick={()=>setModal(null)}>{t.cancel}</button><button className="mbtn-r" onClick={()=>revokeApp(modal)}>{t.revokeNow}</button></div></div></div>}

    {showOnboarding && <OnboardingModal/>}

    <div className={`toast ${toast.show?"show":""}`}><div className="toast-icon">✓</div>{toast.msg}</div>
    </>
  );
}
