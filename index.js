const { default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason
} = require("@whiskeysockets/baileys")

const pino = require("pino")

let phoneNumber = "255785319842" // WEKA NAMBA YAKO

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

const RATIBA_FULL = `
💖🌹 LOVE MATCH ZONE WEEKLY SCHEDULE 🌹💖

━━━━━━━━━━

📅 MONDAY – SELF LOVE DAY 💕

Jipende, jithamini na anza wiki kwa nguvu 💫
📝 Share ratiba zako za wiki inayoanza ili tukumbukane kwenye maombi ya kila siku 🙏

📅 TUESDAY – FRIENDSHIP DAY 🤝

Tengeneza urafiki mpya na ongea na watu wapya 💬
📸 Jitambulishe kwenye group (jina, picha na unapoishi) familia LOVE MATCH ZONE tukutambue 💖

📅 WEDNESDAY – LOVE TALK 💘

Mada za mahusiano na ushauri wa mapenzi ❤️
💞 Mpost unayempenda kwa dhati family tumjue wifi au shemeji yetu 😍

📅 THURSDAY – FREE CHAT 💬

Ongea chochote kwa heshima na furaha 😊
📢 Tuma post yako kama utambulisho na kama uko serious kutafuta mpenzi 💌

📅 FRIDAY – FUN DAY 🎉

Michezo, jokes na burudani 😄🔥
🎯 Pia kutakuwa na maswali na utani kutoka kwa Admin waliopo online 🤩

📅 SATURDAY – MATCH DAY 💞

Kutafuta match & connection za kweli 💌
❤️ Tafuta anayekupenda kwa makubaliano, heshima na utulivu — usilazimishe mapenzi 💫

📅 SUNDAY – BLESSINGS DAY 🙏

Shukrani, baraka na ujumbe wa moyo 💖
📊 Kila mtu atashare mafanikio yake ya wiki nzima kulingana na malengo yake 🌟

━━━━━━━━━━

💎 LOVE MATCH ZONE FAMILY 💎

💞 Tunajenga upendo, heshima na furaha pamoja ❤️✨
`

const MAJINA_YA_SIKU = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"]
const MIEZI = ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"]

let sock
let restartAttempts = 0
const MAX_RESTART_ATTEMPTS = 999

// ================= ANTI-CRASH SYSTEM =================
process.on("uncaughtException", (err) => {
    console.log("🔥 UNCAUGHT EXCEPTION:", err.message)
    console.log("⚡ INARESTART AUTOMATICALLY NDANI YA SEKUNDE 3...")
    restartAttempts++
    setTimeout(() => {
        startBot()
    }, 3000)
})

process.on("unhandledRejection", (reason, promise) => {
    console.log("🔥 UNHANDLED REJECTION:", reason)
    console.log("⚡ INARESTART AUTOMATICALLY NDANI YA SEKUNDE 3...")
    restartAttempts++
    setTimeout(() => {
        startBot()
    }, 3000)
})

setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log("🧹 RAM imesafishwa - Bot inaendelea strong")
    }
}, 30 * 60 * 1000)

async function startBot() {
    try {
        console.log(`🚀 KUANZISHA BOT - Jaribio la ${restartAttempts + 1}`)

        const { state, saveCreds } = await useMultiFileAuthState("./session")
        const { version } = await fetchLatestBaileysVersion()

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: "silent" }),
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

        sock.ev.on("creds.update", saveCreds)

        let pairingRequested = false
        let taggingInProgress = false

        function securityMessage() {
            return `
🚨 SECURITY ALERT - ACCESS DENIED 🚨

SAMAHANI MKUU BOT HII NI YA VIONGOZI PEKEE

╔══════════╗
║ 🛡️ SYSTEM: SECURED AND FULLY ACTIVE 🛡️ ║
║ ⚠️ VIOLATION: UNAUTHORIZED ACCESS ⚠️ ║
║ 🔒 THREAT LEVEL: DETECTED AND BLOCKED 🔒 ║
║ 🔥 FIREWALL: MAXIMUM PROTECTION 🔥 ║
╚══════════╝

⛔ TAHADHARI KUU ⛔
Umejaribu kutoa amri kwa bot bila kuwa Admin wa group.
System ya usalama imeku-detect na kukublock moja kwa moja.

🔐 AMRI ZINARUHUSIWA KWA GROUP ADMINS TU 🔐

 KYC SECURITY PROTOCOL V5.0 - ALWAYS ACTIVE
`
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
            const seconds = now.getSeconds()

            if (hours === 6 && minutes === 0 && seconds === 0 &&!taggingInProgress) {
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
                await new Promise(resolve => setTimeout(resolve, 60000))

                while (participants.length > 0) {
                    const chunk = participants.splice(0, 20)

                    let tagText = `🌟 SALAM ZA ASUBUHI 🌟\n\n`
                    tagText += chunk.map(m => `✨👉@${m.split("@")[0]}`).join("\n")
                    tagText += `\n\n💖 GOOD MORNING GROUP LOVE MATCH ZONE FAMILY 💖\n🌸 NATUMAINI TUMEAMKA SALAMA GROUPS 🌸`

                    await sock.sendMessage(groupId, {
                        text: tagText,
                        mentions: chunk
                    })

                    if (participants.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, 60000))
                    }
                }

                const endMsg = `🎊 SALAM ZANGU ZIMEISHIA HAPA 🎊\n\n💌 NAOMBA KAMA UMEPATA TAG YANGU PLEASE NIAMBIE 💌\n🤖 BY KAHENYA BOT 🤖\n\n🌈 NAWATAKIENI ASUBUHI NJEMA NA YENYE BARAKA NA MAFANIKIO MAKUBWA 🌈\n💎 LOVE MATCH ZONE PAMOJA TUNAWEZA 💎`

                await sock.sendMessage(groupId, { text: endMsg })

            } catch (e) {
                console.log(`Error kutag group ${groupId}:`, e)
            }
        }

        setInterval(checkMorningWakeup, 1000)

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === "connecting") {
                console.log("⏳ Connecting...")
            }

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
                console.log("✅ CONNECTED SUCCESSFULLY - ANTI-CRASH ACTIVE")
                restartAttempts = 0
            }

            if (connection === "close") {
                let reason = lastDisconnect?.error?.output?.statusCode

                console.log("❌ Connection closed:", reason)

                if (reason!== DisconnectReason.loggedOut) {
                    console.log("⚡ INARESTART AUTOMATICALLY NDANI YA SEKUNDE 5...")
                    setTimeout(() => {
                        startBot()
                    }, 5000)
                } else {
                    console.log("🔒 LOGGED OUT - Tafadhali scan QR tena")
                }
            }
        })

        sock.ev.on("group-participants.update", async (update) => {
            try {
                const metadata = await sock.groupMetadata(update.id)
                for (let participant of update.participants) {
                    let userJid = ""
                    if (typeof participant === 'string') {
                        userJid = participant
                    } else if (participant && typeof participant === 'object') {
                        userJid = participant.id || participant.jid || participant.participant || ""
                    }

                    if (!userJid ||!userJid.includes('@')) continue

                    const userNum = userJid.split("@")[0]

                    if (update.action === "add") {
                        await sock.sendMessage(update.id, {
                            text: `🎉 Karibu sana @${userNum} kwenye ${metadata.subject} 🎉\n\n💫 Jisikie nyumbani ndungu 💫`,
                            mentions: [userJid]
                        })
                    } else if (update.action === "remove") {
                        await sock.sendMessage(update.id, {
                            text: `😢 @${userNum} Ameondoka kwenye group 😢\n\n💔 Tutamkumbuka basi tunakutakia kila lsheri💔`,
                             mentions: [userJid]
                        })
                    }
                }
            } catch (e) {
                console.log("Welcome/Goodbye error:", e.message)
            }
        })

        sock.ev.on("messages.upsert", async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg.message) return
                if (msg.key.fromMe) return

                const from = msg.key.remoteJid
                const sender = msg.key.participant || from
                const isGroup = from.endsWith("@g.us")

                console.log("📩 MESSAGE RECEIVED:", JSON.stringify(msg.message, null, 2))

                if (!isGroup) return

                const text =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption ||
                    msg.message.documentMessage?.caption ||
                    msg.message.buttonsResponseMessage?.selectedButtonId ||
                    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                    msg.message.templateButtonReplyMessage?.selectedId ||
                    ""

                console.log("📝 TEXT PARSED:", text)

                if (text.toLowerCase().includes("test")) {
                    await sock.sendMessage(from, { text: "✅ BOT IKO LIVE NA INASOMA MESSAGES" }, { quoted: msg })
                    return
                }

                if (text.toLowerCase() === "hi") {
                    await sock.sendMessage(from, { text: "👋 Bot iko live!" }, { quoted: msg })
                }

                if (text.toLowerCase() === "-ping") {
                    if (!(await isAdmin(from, sender))) {
                        return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                    }
                    await sock.sendMessage(from, { text: "⚡ NAAM MKUU KAHENYA ACTIVE 24/7 ⚡" }, { quoted: msg })
                }

                if (text.toLowerCase() === "-ratiba") {
                    if (!(await isAdmin(from, sender))) {
                        return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                    }

                    const leo = new Date()
                    const siku = MAJINA_YA_SIKU[leo.getDay()]
                    const tarehe = leo.getDate()
                    const mwezi = MIEZI[leo.getMonth()]
                    const mwaka = leo.getFullYear()

                    // HAPA NDIO NIMEFIX - SASA INATOA RATIBA SAHI YA SIKU
                    const ratibaLeo = RATIBA_ZOTE[siku] || "❌ Hakuna ratiba ya siku hii"

                    const ujumbe = `
📅 *RATIBA YA LEO* 📅

🗓️ *SIKU:* ${siku}
📆 *TAREHE:* ${tarehe} ${mwezi} ${mwaka}

━━━━━━━━━━

${ratibaLeo}

━━━━━━━━━━

💖 LOVE MATCH ZONE 💖
`

                    await sock.sendMessage(from, { text: ujumbe }, { quoted: msg })
                }

                if (text.toLowerCase() === "-ratiba full") {
                    if (!(await isAdmin(from, sender))) {
                        return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                    }

                    try {
                        const metadata = await sock.groupMetadata(from)
                        const jinaGroup = metadata.subject

                        let ratibaZote = `📋 RATIBA ZA GROUP 📋\n👥 JINA LA GROUP: ${jinaGroup}\n\n${RATIBA_FULL}`

                        await sock.sendMessage(from, { text: ratibaZote }, { quoted: msg })
                    } catch (e) {
                        await sock.sendMessage(from, { text: "❌ Imeshindikana kupata ratiba zote" }, { quoted: msg })
                    }
                }

                // ================= -ONGEZA COMMAND =================
                if (text.toLowerCase().startsWith("-ongeza ")) {
                    if (!(await isAdmin(from, sender))) {
                        return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                    }

                    const num = text.split(" ")[1]
                    if (!num) return await sock.sendMessage(from, { text: "⚠️ Weka namba sahihi\nMfano: -ongeza 255785319842" }, { quoted: msg })

                    const jid = num.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                    try {
                        await sock.groupParticipantsUpdate(from, [jid], "add")
                        await sock.sendMessage(from, { text: `✅ NIMEFANIKIWA KUMUONGEZA ${num} KWENYE GROUP ✅` }, { quoted: msg })
                    } catch (err) {
                        await sock.sendMessage(from, { text: `❌ NIMESHINDWA KUMUONGEZA ${num}\n🔴 Sababu: ${err.message}` }, { quoted: msg })
                    }
                }

                // ================= -ONDOA COMMAND =================
                if (text.toLowerCase().startsWith("-ondoa ")) {
                    if (!(await isAdmin(from, sender))) {
                        return await sock.sendMessage(from, { text: securityMessage() }, { quoted: msg })
                    }

                    const num = text.split(" ")[1]
                    if (!num) return await sock.sendMessage(from, { text: "⚠️ Weka namba sahihi\nMfano: -ondoa 255785319842" }, { quoted: msg })

                    const jid = num.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                    try {
                        await sock.groupParticipantsUpdate(from, [jid], "remove")
                        await sock.sendMessage(from, { text: `✅ NIMEFANIKIWA KUMUONDOA ${num} KWENYE GROUP ✅` }, { quoted: msg })
                    } catch (err) {
                        await sock.sendMessage(from, { text: `❌ NIMESHINDWA KUMUONDOA ${num}\n🔴 Sababu: ${err.message}` }, { quoted: msg })
                    }
                }

            } catch (e) {
                console.log("Message handler error:", e.message)
            }
        })

    } catch (err) {
        console.log("🔥 BOT CRASH ERROR:", err.message)
        console.log("⚡ INARESTART NDANI YA SEKUNDE 3...")
        setTimeout(() => {
            startBot()
        }, 3000)
    }
}

startBot()
