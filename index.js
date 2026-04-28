const {    
    default: makeWASocket,    
    useMultiFileAuthState,    
    fetchLatestBaileysVersion,    
    DisconnectReason    
} = require("@whiskeysockets/baileys")    
    
const pino = require("pino")    

let phoneNumber = "2557XXXXXXXX"

let reconnecting = false
let isStarting = false

// 🔐 ADMIN CHECK
async function isGroupAdmin(sock, groupJid, senderJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid)
        const user = metadata.participants.find(p => p.id === senderJid)
        return user?.admin === "admin" || user?.admin === "superadmin"
    } catch {
        return false
    }
}

async function startBot() {

    if (isStarting) return
    isStarting = true

    const { state, saveCreds } = await useMultiFileAuthState("./session")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Kahenya Bot", "Chrome", "1.0.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    const reply = async (jid, text, msg) => {
        await sock.sendMessage(jid, { text }, { quoted: msg })
    }

    // 🛡️ ANTI CRASH
    process.on("uncaughtException", err => console.log("❌ Crash:", err.message))
    process.on("unhandledRejection", err => console.log("❌ Promise:", err.message))

    // 🔑 PAIRING CONTROL (ONLY ONCE)
    let pairingRequested = false

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update

        if (!pairingRequested && !sock.authState.creds.registered) {
            pairingRequested = true

            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber)
                    code = code.match(/.{1,4}/g).join("-")

                    console.log("\n🔑 PAIRING CODE:\n", code, "\n")
                } catch (err) {
                    console.log("❌ Pairing error:", err.message)
                }
            }, 10000)
        }

        if (connection === "open") {
            console.log("✅ CONNECTED SUCCESSFULLY - ACTIVE 24/7")

            // 💓 KEEP ALIVE
            setInterval(async () => {
                try {
                    await sock.sendPresenceUpdate("available")
                    console.log("💓 Keep alive ping")
                } catch {}
            }, 20000)

            isStarting = false
        }

        if (connection === "close") {
            let reason = lastDisconnect?.error?.output?.statusCode
            console.log("❌ Connection closed:", reason)

            if (reason !== DisconnectReason.loggedOut) {
                if (reconnecting) return
                reconnecting = true

                console.log("🔄 Reconnecting safely...")

                setTimeout(() => {
                    reconnecting = false
                    isStarting = false
                    startBot()
                }, 60000) // 🔥 60s cooldown
            }
        }
    })

    // 👥 WELCOME & GOODBYE
    sock.ev.on("group-participants.update", async (update) => {
        const groupId = update.id

        for (let user of update.participants) {

            const tag = user?.split?.("@")?.[0] || user?.id?.split?.("@")?.[0] || "member"

            if (update.action === "add") {
                await sock.sendMessage(groupId, {
                    text:
`━━━━━━━━━━━━━━━━━━━
🎉 KARIBU KWENYE GROUP 🎉

👋 @${tag} KARIBU SANA!

🌟 Tunafurahi kukuona hapa
✔ Kujifunza 📚
✔ Ushirikiano 🤝
✔ Marafiki 😊

📌 Tafadhali fuata sheria za group
🚫 Epuka spam na matusi

💙 Karibu kwenye familia yetu
━━━━━━━━━━━━━━━━━━━`,
                    mentions: [user]
                })
            }

            if (update.action === "remove") {
                await sock.sendMessage(groupId, {
                    text:
`━━━━━━━━━━━━━━━━━━━
💔 GOODBYE 💔

😔 @${tag} ameondoka

🙏 Asante kwa muda wako
🌹 Safari njema

💫 Karibu tena wakati wowote
━━━━━━━━━━━━━━━━━━━`,
                    mentions: [user]
                })
            }
        }
    })

    // 💬 COMMANDS
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

        const isGroup = from.endsWith("@g.us")
        const admin = isGroup ? await isGroupAdmin(sock, from, sender) : false

        const noPerm = "⛔ Admin tu wanaruhusiwa kutumia command hii"

        // 📜 SHERIA (UNCHANGED)
        if (text.toLowerCase() === "sheria") {
            return reply(from,
`📜 GROUP RULES KYC SYSTEM 📜
             SHERIA ZA GROUP 
1 🚫 No links == hakuna Link
2 🚫 No insults == hakuna matusi
3 🚫 No dirty videos == hakuna video chafu
4 🚫 No dirty pictures == hakuna picha chafu
5 🚫 Respect admins == heshima kwa viongozi
6 🚫 Sticks are allowed == stick zinaruhusiwa
7 🚫 No exceptions == hakuna kubaguana
8 🚫 No inbox match == hakuna kufatana DM
9 🚫 No posting ads == hakuna matanganzo
10 🚫 No bot usage == hakuna matumizi ya bot
`, msg)
        }

        // ➕ ADD
        if (text.startsWith("-add")) {
            if (!isGroup) return reply(from, "Group only", msg)
            if (!admin) return reply(from, noPerm, msg)

            let number = text.split(" ")[1]
            await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], "add")

            return reply(from,
`━━━━━━━━━━━━━━━━━━━
✅ MEMBER AMEONGEZWA

📌 ${number}
👤 Admin action

🔥 Karibu sana kwenye group
━━━━━━━━━━━━━━━━━━━`, msg)
        }

        // ➖ REMOVE
        if (text.startsWith("-remove")) {
            if (!isGroup) return reply(from, "Group only", msg)
            if (!admin) return reply(from, noPerm, msg)

            let number = text.split(" ")[1]
            await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], "remove")

            return reply(from,
`━━━━━━━━━━━━━━━━━━━
❌ MEMBER AMEONDOLEWA

📌 ${number}
👤 Admin action

🙏 Asante kwa muda wake
━━━━━━━━━━━━━━━━━━━`, msg)
        }

        // 📌 PIN
        if (text.toLowerCase() === "pin") {
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                return sock.sendMessage(from, msg.message.extendedTextMessage.contextInfo.quotedMessage)
            } else {
                return reply(from, "Reply message unayotaka kupin", msg)
            }
        }

        // 📡 PING
        if (text === "-ping") {
            return reply(from, "🚀 KAHENYA ACTIVE 24/7 ⚡", msg)
        }

    })
}

startBot()
