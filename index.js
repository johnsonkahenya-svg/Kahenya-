const fs = require("fs-extra")
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")

const logger = pino({ level: "error" })

// 🔥 FILE LOCK SMART
const LOCK_FILE = "./bot.lock"
try {
  if (fs.existsSync(LOCK_FILE)) {
    const pid = fs.readFileSync(LOCK_FILE, 'utf8')
    try {
      process.kill(pid, 0)
      console.log("⚠️ Bot already running (PID:", pid + ")")
      process.exit(0)
    } catch (e) {
      console.log("🔓 Stale lock found, removing...")
      fs.unlinkSync(LOCK_FILE)
    }
  }
} catch (e) {}

fs.writeFileSync(LOCK_FILE, process.pid.toString())

const cleanup = () => {
  if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE)
}

process.on("exit", cleanup)
process.on("SIGINT", () => { cleanup(); process.exit(0) })
process.on("SIGTERM", () => { cleanup(); process.exit(0) })

process.on("uncaughtException", err => console.log("ERROR:", err))
process.on("unhandledRejection", err => console.log("REJECTION:", err))

let phoneNumber = "255785319842"
let isStarting = false
const SESSION_FOLDER = "./session"
const BACKUP_FOLDER = "./session-backup"

// 🚫 RECONNECT LIMITER - IMPORTANT FIX
let reconnectCount = 0
const MAX_RECONNECTS = 5

// AUTO RESTORE
if (!fs.existsSync(SESSION_FOLDER)) {
  if (fs.existsSync(BACKUP_FOLDER)) {
    fs.copySync(BACKUP_FOLDER, SESSION_FOLDER)
    console.log("♻️ Session restored from backup")
  } else {
    fs.mkdirSync(SESSION_FOLDER, { recursive: true })
    console.log("📁 SESSION FOLDER IMEUNDWA")
  }
}

// ================= RATIBA ZA LOVE MATCH ZONE =================
const RATIBA_ZOTE = {
    "Jumatatu": `MONDAY – SELF LOVE DAY 💫\n\nJipende, jithamini na anza wiki kwa nguvu\nShare ratiba zako za wiki inayoanza ili tukumbukane kwenye maombi ya kila siku 🙏`,
    "Jumanne": `TUESDAY – FRIENDSHIP DAY 🤝\n\nTengeneza urafiki mpya na ongea na watu wapya 💬\nJitambulishe kwenye group (jina, picha na unapoishi) familia LOVE MATCH ZONE tukutambue 💖`,
    "Jumatano": `WEDNESDAY – LOVE TALK 💘\n\nMada za mahusiano na ushauri wa mapenzi ❤️\nMpost unayempenda kwa dhati family tumjue wifi au shemeji yetu 😍`,
    "Alhamisi": `THURSDAY – FREE CHAT 💬\n\nOngea chochote kwa heshima na furaha 😊\nTuma post yako kama utambulisho na kama uko serious kutafuta mpenzi 💌`,
    "Ijumaa": `FRIDAY – FUN DAY 🎉\n\nMichezo, jokes na burudani 😄\nPia kutakuwa na maswali na utani kutoka kwa Admin waliopo online 🤩`,
    "Jumamosi": `SATURDAY – MATCH DAY 💞\n\nKutafuta match & connection za kweli 💌\nTafuta anayekupenda kwa makubaliano, heshima na utulivu — usilazimishe mapenzi 💫`,
    "Jumapili": `SUNDAY – BLESSINGS DAY 🙏\n\nShukrani, baraka na ujumbe wa moyo 💖\nKila mtu atashare mafanikio yake ya wiki nzima kulingana na malengo yake 🌟`
}

const RATIBA_FULL = `💖🌹 LOVE MATCH ZONE WEEKLY SCHEDULE 🌹💖\n\n━━━━━━━━━━\n\n📅 MONDAY – SELF LOVE DAY 💕\n\nJipende, jithamini na anza wiki kwa nguvu 💫\n📝 Share ratiba zako za wiki inayoanza ili tukumbukane kwenye maombi ya kila siku 🙏\n\n📅 TUESDAY – FRIENDSHIP DAY 🤝\n\nTengeneza urafiki mpya na ongea na watu wapya 💬\n📸 Jitambulishe kwenye group (jina, picha na unapoishi) familia LOVE MATCH ZONE tukutambue 💖\n\n📅 WEDNESDAY – LOVE TALK 💘\n\nMada za mahusiano na ushauri wa mapenzi ❤️\n💞 Mpost unayempenda kwa dhati family tumjue wifi au shemeji yetu 😍\n\n📅 THURSDAY – FREE CHAT 💬\n\nOngea chochote kwa heshima na furaha 😊\n📢 Tuma post yako kama utambulisho na kama uko serious kutafuta mpenzi 💌\n\n📅 FRIDAY – FUN DAY 🎉\n\nMichezo, jokes na burudani 😄🔥\n🎯 Pia kutakuwa na maswali na utani kutoka kwa Admin waliopo online 🤩\n\n📅 SATURDAY – MATCH DAY 💞\n\nKutafuta match & connection za kweli 💌\n❤️ Tafuta anayekupenda kwa makubaliano, heshima na utulivu — usilazimishe mapenzi 💫\n\n📅 SUNDAY – BLESSINGS DAY 🙏\n\nShukrani, baraka na ujumbe wa moyo 💖\n📊 Kila mtu atashare mafanikio yake ya wiki nzima kulingana na malengo yake 🌟\n\n━━━━━━━━━━\n\n💎 LOVE MATCH ZONE FAMILY 💎\n\n💞 Tunajenga upendo, heshima na furaha pamoja ❤️✨`

const MAJINA_YA_SIKU = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"]
const MIEZI = ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"]

let sock

// 💾 MEMORY PROTECTION - GRACEFUL EXIT
setInterval(async () => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024
    console.log(`📊 RAM USED: ${Math.round(used)} MB`)
    if (used > 450) {
        console.log("⚠️ RAM kubwa sana, restart salama...")
        if (sock) {
            await sock.logout()
            await new Promise(r => setTimeout(r, 2000))
        }
        process.exit(0)
    }
}, 60000)

// ❤️ HEARTBEAT SYSTEM
setInterval(() => {
    if (!sock ||!sock.user ||!sock.ws || sock.ws.readyState!== 1) {
        console.log("⚠️ Bot offline detected, restarting...")
        isStarting = false
        startBot()
    }
}, 30000)

const getText = (msg) => {
  return msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentMessage?.caption || msg?.buttonsResponseMessage?.selectedButtonId || msg?.listResponseMessage?.singleSelectReply?.selectedRowId || msg?.templateButtonReplyMessage?.selectedId || ""
}

async function startBot() {
    if (isStarting) return
    isStarting = true

    try {
        console.log(`🚀 KUANZISHA BOT - Jaribio la ${reconnectCount + 1}`)

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)
        const { version } = await fetchLatestBaileysVersion()

        sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: ["Ubuntu", "Chrome", "20.0.0"],
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            getMessage: async (key) => {
                return { conversation: "hello" }
            },
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 250
        })

        // 🔥 SMART BACKUP
        sock.ev.on("creds.update", async () => {
            try {
                await saveCreds()
                await fs.copy(SESSION_FOLDER, BACKUP_FOLDER)
                console.log("💾 Smart backup done - session saved safely")
            } catch (e) {
                console.log("Backup error:", e)
            }
        })

        let pairingRequested = false
        let taggingInProgress = false

        // 🚨 SECURITY MESSAGE - ADMIN TU
        function securityMessage() {
            return `🚨 SECURITY ALERT - ACCESS DENIED 🚨\n\nSAMAHANI MKUU BOT HII NI YA VIONGOZI PEKEE\n\n╔══════════╗\n║ 🛡️ SYSTEM: SECURED AND FULLY ACTIVE 🛡️ ║\n║ ⚠️ VIOLATION: UNAUTHORIZED ACCESS ⚠️ ║\n║ 🔒 THREAT LEVEL: DETECTED AND BLOCKED 🔒 ║\n║ 🔥 FIREWALL: MAXIMUM PROTECTION 🔥 ║\n╚══════════╝\n\n⛔ TAHADHARI KUU ⛔\nUmejaribu kutoa amri kwa bot bila kuwa Admin wa group.\nSystem ya usalama imeku-detect na kukublock moja kwa moja.\n\n🔐 AMRI ZINARUHUSIWA KWA GROUP ADMINS TU 🔐\n\n KYC SECURITY PROTOCOL V5.0 - ALWAYS ACTIVE`
        }

        async function isAdmin(groupJid, userJid) {
            try {
                const meta = await sock.groupMetadata(groupJid)
                const participant = meta.participants.find(p => p.id === userJid)
                return participant?.admin === "admin" || participant?.admin === "superadmin"
            } catch {
                return false
            }
        }

        function checkMorningWakeup() {
            const now = new Date()
            const hours = now.getHours()
            const minutes = now.getMinutes()
            if (hours === 6 && minutes === 0 &&!taggingInProgress) {
                taggingInProgress = true
                wakeUpAllGroups()
            }
        }

        async function wakeUpAllGroups() {
            try {
                const groups = await sock.groupFetchAllParticipating()
                const groupIds = Object.keys(groups)
                for (let groupId of groupIds) {
                    await tagGroupMembers(groupId)
                    await new Promise(resolve => setTimeout(resolve, 5000))
                }
            } catch (e) {
                console.log("Wakeup error:", e)
            } finally {
                taggingInProgress = false
            }
        }

        async function tagGroupMembers(groupId) {
            try {
                const metadata = await sock.groupMetadata(groupId)
                let participants = metadata.participants.map(p => p.id)
                const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net"
                participants = participants.filter(p => p!== botJid)

                const leo = new Date()
                const siku = MAJINA_YA_SIKU[leo.getDay()]
                const tarehe = leo.getDate()
                const mwezi = MIEZI[leo.getMonth()]
                const mwaka = leo.getFullYear()
                const saa = String(leo.getHours()).padStart(2, '0')
                const dakika = String(leo.getMinutes()).padStart(2, '0')
                const sekunde = String(leo.getSeconds()).padStart(2, '0')

                const startMsg = `🌅 LEO NI ${siku.toUpperCase()} 🌅\n📅 TAREHE: ${tarehe} ${mwezi} ${mwaka}\n⏰ SAA: ${saa}:${dakika}:${sekunde}\n\n✨ TAG YA SALAM YA LEO ASUBUHI INAENDA KWANZA KAMA IFATAVYO ✨`
                await sock.sendMessage(groupId, { text: startMsg })
                await new Promise(resolve => setTimeout(resolve, 90000))

                while (participants.length > 0) {
                    const chunk = participants.splice(0, 20)
                    let tagText = `🌟 SALAM ZA ASUBUHI 🌟\n\n`
                    tagText += chunk.map(m => `✨👉@${m.split("@")[0]}`).join("\n")
                    tagText += `\n\n💖 GOOD MORNING GROUP LOVE MATCH ZONE FAMILY 💖\n🌸 NATUMAINI TUMEAMKA SALAMA GROUPS 🌸`
                    await sock.sendMessage(groupId, { text: tagText, mentions: chunk })
                    if (participants.length > 0) await new Promise(resolve => setTimeout(resolve, 90000))
                }

                const endMsg = `🎊 SALAM ZANGU ZIMEISHIA HAPA 🎊\n\n💌 NAOMBA KAMA UMEPATA TAG YANGU PLEASE NIAMBIE 💌\n🤖 BY KAHENYA BOT 🤖\n\n🌈 NAWATAKIENI ASUBUHI NJEMA NA YENYE BARAKA NA MAFANIKIO MAKUBWA 🌈\n💎 LOVE MATCH ZONE PAMOJA TUNAWEZA 💎`
                await sock.sendMessage(groupId, { text: endMsg })
            } catch (e) {
                console.log(`Error kutag group ${groupId}:`, e)
            }
        }

        setInterval(checkMorningWakeup, 1000)

        // 🔴 CONNECTION HANDLER - WITH CONFLICT FIX
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === "connecting") console.log("⏳ Connecting...")

            if (!pairingRequested &&!sock.authState.creds.registered) {
                pairingRequested = true
                setTimeout(async () => {
                    try {
                        let code = await sock.requestPairingCode(phoneNumber)
                        code = code.match(/.{1,4}/g).join("-")
                        console.log("\n🔑 PAIRING CODE:\n", code, "\n")
                    } catch (err) {
                        console.log("❌ Pairing error:", err.message)
                    }
                }, 8000)
            }

            if (connection === "open") {
                console.log("✅ BOT ONLINE")
                isStarting = false
                reconnectCount = 0 // RESET COUNT WAKATI UMEFANIKIWA
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const reason = lastDisconnect?.error?.output?.payload?.message || ""

                console.log("❌ CONNECTION CLOSED:", statusCode, reason)
                isStarting = false

                // 🧠 HANDLE "conflict replaced" properly
                if (statusCode === 440 || reason.includes("conflict") || reason.includes("replaced")) {
                    console.log("❌ Session replaced detected. Stopping bot to prevent loop.");
                    cleanup()
                    process.exit(0)
                }

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log("🔒 LOGGED OUT - Futa session folder")
                    await fs.remove(SESSION_FOLDER)
                    await fs.remove(BACKUP_FOLDER)
                    cleanup()
                    process.exit(1)
                }

                // 🚫 Zuia multiple connections - IMPORTANT FIX
                reconnectCount++
                if (reconnectCount > MAX_RECONNECTS) {
                    console.log("❌ Too many reconnects, stopping bot to prevent loop");
                    cleanup()
                    process.exit(1)
                }

                setTimeout(() => startBot(), 5000)
            }
        })

        sock.ev.on("group-participants.update", async (update) => {
            try {
                const metadata = await sock.groupMetadata(update.id)
                for (let participant of update.participants) {
                    let userJid = typeof participant === 'string'? participant : participant.id || participant.jid || participant.participant || ""
                    if (!userJid ||!userJid.includes('@')) continue
                    const userNum = userJid.split("@")[0]

                    if (update.action === "add") {
                        await sock.sendMessage(update.id, { text: `🎉 Karibu sana @${userNum} kwenye ${metadata.subject} 🎉\n\n💫 Jisikie nyumbani ndungu 💫`, mentions: [userJid] })
                    } else if (update.action === "remove") {
                        await sock.sendMessage(update.id, { text: `😢 @${userNum} Ameondoka kwenye group 😢\n\n💔 Tutamkumbuka basi tunakutakia kila laheri💔`, mentions: [userJid] })
                    }
                }
            } catch (e) {
                console.log("Welcome/Goodbye error:", e.message)
            }
        })

        sock.ev.on("messages.upsert", async ({ messages }) => {
            try {
                const msg = messages[0]
                if (!msg.message || msg.key.fromMe) return

                const from = msg.key.remoteJid
                const sender = msg.key.participant || from
                const isGroup = from.endsWith("@g.us")
                const text = getText(msg.message)
                console.log("📩 MSG:", text)

                if (!isGroup) return

                if (text.startsWith("-")) {
                    const cmd = text.slice(1).toLowerCase().split(" ")[0]
                    const args = text.slice(1).split(" ")

                    // 🔐 HIZI COMMAND NI ZA ADMIN TU
                    if (cmd === "ping") {
                        if (!(await isAdmin(from, sender))) return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                        await sock.sendMessage(from, { text: "⚡ NAAM MKUU KAHENYA ACTIVE 24/7 ⚡" }, { quoted: msg })
                    }

                    if (cmd === "ratiba" &&!args[1]) {
                        if (!(await isAdmin(from, sender))) return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                        const leo = new Date()
                        const siku = MAJINA_YA_SIKU[leo.getDay()]
                        const tarehe = leo.getDate()
                        const mwezi = MIEZI[leo.getMonth()]
                        const mwaka = leo.getFullYear()
                        const ratibaLeo = RATIBA_ZOTE || "❌ Hakuna ratiba ya siku hii"
                        const ujumbe = `📅 *RATIBA YA LEO* 📅\n\n🗓️ *SIKU:* ${siku}\n📆 *TAREHE:* ${tarehe} ${mwezi} ${mwaka}\n\n━━━━━━━━━━\n\n${ratibaLeo}\n\n━━━━━━━━━━\n\n💖 LOVE MATCH ZONE 💖`
                        await sock.sendMessage(from, { text: ujumbe }, { quoted: msg })
                    }

                    if (cmd === "ratiba" && args[1] === "full") {
                        if (!(await isAdmin(from, sender))) return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                        try {
                            const metadata = await sock.groupMetadata(from)
                            const jinaGroup = metadata.subject
                            let ratibaZote = `📋 RATIBA ZA GROUP 📋\n👥 JINA LA GROUP: ${jinaGroup}\n\n${RATIBA_FULL}`
                            await sock.sendMessage(from, { text: ratibaZote }, { quoted: msg })
                        } catch (e) {
                            await sock.sendMessage(from, { text: "❌ Imeshindikana kupata ratiba zote" }, { quoted: msg })
                        }
                    }

                    if (cmd === "ongeza") {
                        if (!(await isAdmin(from, sender))) return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                        const num = args[1]
                        if (!num) return await sock.sendMessage(from, { text: "⚠️ Weka namba sahihi\nMfano: -ongeza 255785319842" }, { quoted: msg })
                        if (num.length < 10 || num.length > 15) return await sock.sendMessage(from, { text: "❌ Namba sio sahihi" }, { quoted: msg })
                        const jid = num.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                        try {
                            await sock.groupParticipantsUpdate(from, [jid], "add")
                            await sock.sendMessage(from, { text: `✅ NIMEFANIKIWA KUMUONGEZA ${num} KWENYE GROUP ✅` }, { quoted: msg })
                        } catch (err) {
                            await sock.sendMessage(from, { text: `❌ NIMESHINDWA KUMUONGEZA ${num}\n🔴 Sababu: ${err.message}` }, { quoted: msg })
                        }
                    }

                    if (cmd === "ondoa") {
                        if (!(await isAdmin(from, sender))) return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                        const num = args[1]
                        if (!num) return await sock.sendMessage(from, { text: "⚠️ Weka namba sahihi\nMfano: -ondoa 255785319842" }, { quoted: msg })
                        if (num.length < 10 || num.length > 15) return await sock.sendMessage(from, { text: "❌ Namba sio sahihi" }, { quoted: msg })
                        const jid = num.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                        try {
                            await sock.groupParticipantsUpdate(from, [jid], "remove")
                            await sock.sendMessage(from, { text: `✅ NIMEFANIKIWA KUMUONDOA ${num} KWENYE GROUP ✅` }, { quoted: msg })
                        } catch (err) {
                            await sock.sendMessage(from, { text: `❌ NIMESHINDWA KUMUONDOA ${num}\n🔴 Sababu: ${err.message}` }, { quoted: msg })
                        }
                    }
                }

                if (text.toLowerCase() === "hi") await sock.sendMessage(from, { text: "👋 Bot iko live!" }, { quoted: msg })
                if (text.toLowerCase() === "test") await sock.sendMessage(from, { text: "✅ BOT IKO LIVE NA INASOMA MESSAGES" }, { quoted: msg })

            } catch (e) {
                console.log("Message handler error:", e.message)
            }
        })

    } catch (err) {
        console.log("🔥 ERROR:", err)
        isStarting = false
        setTimeout(() => startBot(), 5000)
    }
}

startBot()
