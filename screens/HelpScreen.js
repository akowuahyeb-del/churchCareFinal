
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, Modal, TextInput, Alert,
  Linking, ActivityIndicator, KeyboardAvoidingView,
  Platform, FlatList, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";

const { width: W } = Dimensions.get("window");

// ── Pastoral & welfare categories ─────────────────────────────────
const PASTORAL_CATEGORIES = [
  { key: "counselling",  label: "Counselling",      icon: "heart-outline",           color: "#E11D48", bg: "#FFF1F2",  desc: "Personal & spiritual counselling with a pastor" },
  { key: "prayer",       label: "Prayer Request",   icon: "prism-outline",           color: "#6C5CE7", bg: "#F0EEFF",  desc: "Submit a prayer request to the prayer team" },
  { key: "welfare",      label: "Welfare Support",  icon: "hand-left-outline",       color: "#00B894", bg: "#E8FBF5",  desc: "Financial or material assistance for members in need" },
  { key: "bereavement",  label: "Bereavement",      icon: "ribbon-outline",          color: "#636e72", bg: "#f4f6fb",  desc: "Support during loss and grief" },
  { key: "hospital",     label: "Hospital Visit",   icon: "medical-outline",         color: "#0984E3", bg: "#EBF4FD",  desc: "Request a pastoral visit to hospital or home" },
  { key: "marriage",     label: "Marriage Support", icon: "rose-outline",            color: "#fd79a8", bg: "#FFF0F5",  desc: "Pre-marital counselling & marriage enrichment" },
  { key: "youth",        label: "Youth Support",    icon: "people-outline",          color: "#FDCB6E", bg: "#FFFBEB",  desc: "Support for young people and families" },
  { key: "addiction",    label: "Recovery Support", icon: "leaf-outline",            color: "#27ae60", bg: "#E8FBF5",  desc: "Confidential support for addiction & recovery" },
];

// ── FAQ data ──────────────────────────────────────────────────────
const FAQS = [
  { q: "How do I register as a member?",        a: "Go to Members → tap the '+' button → fill in your details. Your membership code will be generated automatically." },
  { q: "How do I mark my attendance?",          a: "Open Attendance → select your service → tap the green ✓ next to your name, or ask a leader to scan your QR code." },
  { q: "How do I donate or give?",              a: "Tap 'Donate' on the Home screen or Quick Actions. Choose a category (Tithe, Offering, etc.), enter amount and confirm." },
  { q: "How do I see my giving history?",       a: "Go to Donate → History tab. Your records are sorted by date and category." },
  { q: "How do I switch between church branches?", a: "Tap the church name in the header on the Home screen → select a branch from the list." },
  { q: "How do I request a pastoral visit?",    a: "Go to Help & Support → Pastoral Support → Hospital Visit → submit your request." },
  { q: "My account is locked. What do I do?",  a: "Contact your church admin or use the 'Contact Support' option below. They can unlock your account." },
  { q: "How do I update my profile?",           a: "Go to Settings → tap your name at the top → Edit Profile." },
  { q: "Is my data private?",                   a: "Yes. ChurchCare stores your data securely on Firebase and never shares it with third parties. See Privacy Policy in Settings." },
  { q: "How do I report an issue?",             a: "Use the Help & Support screen → Contact Support → select 'Report a Bug' or chat with our AI assistant." },
];

// ── AI system prompt ──────────────────────────────────────────────
const AI_SYSTEM = `You are a helpful, compassionate support assistant for ChurchCare, a church management app. 
You help church members with:
- Using the ChurchCare app (attendance, giving, members, events, settings)
- Understanding church-related processes and policies
- Pastoral queries (you provide general spiritual encouragement but always recommend speaking to a pastor for deep issues)
- Welfare and support questions (you guide them to the right help channels)

Guidelines:
- Be warm, respectful, and spiritually sensitive
- For serious pastoral issues (mental health, abuse, crisis), always direct them to speak with a pastor or call emergency services
- Keep responses concise and practical
- If you cannot help, suggest they contact the support team directly
- Never make up specific church policies — say "please check with your church admin"`;

export default function HelpScreen() {
  const navigation = useNavigation();

  // Main tab state
  const [activeTab, setActiveTab] = useState("ai"); // ai | pastoral | faq | contact

  // AI chat
  const [messages,    setMessages]    = useState([
    { role: "assistant", text: "Hello! 👋 I'm your ChurchCare assistant. I'm here to help you with the app, answer spiritual questions, or guide you to the right support. How can I help you today?", time: new Date() }
  ]);
  const [userInput,   setUserInput]   = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);
  const chatRef = useRef(null);

  // Pastoral request
  const [pastoralModal,    setPastoralModal]    = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [requestName,      setRequestName]      = useState("");
  const [requestPhone,     setRequestPhone]     = useState("");
  const [requestMessage,   setRequestMessage]   = useState("");
  const [requestUrgent,    setRequestUrgent]    = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitted,        setSubmitted]        = useState(false);

  // FAQ
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [faqSearch,   setFaqSearch]   = useState("");

  // Auto-scroll chat
  useEffect(() => {
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  /* ── AI CHAT ──────────────────────────────────────────────── */
  const sendMessage = async () => {
    const text = userInput.trim();
    if (!text || aiLoading) return;

    const userMsg = { role: "user", text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setAiLoading(true);

    // Build conversation history for API
    const history = [...messages, userMsg].map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text
    }));

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: AI_SYSTEM,
          messages: history
        })
      });
      const data = await response.json();
      const reply = data.content?.map(c => c.text || "").join("") || "I'm sorry, I couldn't process that. Please try again or contact our support team.";
      setMessages(prev => [...prev, { role: "assistant", text: reply, time: new Date() }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "I'm having trouble connecting right now. Please try again shortly, or contact our support team directly using the Contact tab.",
        time: new Date()
      }]);
    } finally {
      setAiLoading(false); }
  };

  const clearChat = () => {
    Alert.alert("Clear Chat?", "This will reset your conversation.", [
      { text: "Cancel" },
      { text: "Clear", onPress: () => setMessages([{ role: "assistant", text: "Hello! 👋 How can I help you today?", time: new Date() }]) }
    ]);
  };

  /* ── PASTORAL REQUEST ─────────────────────────────────────── */
  const submitPastoralRequest = async () => {
    if (!requestName.trim() || !requestMessage.trim()) {
      Alert.alert("Required", "Please fill in your name and message."); return;
    }
    setSubmitting(true);
    // Simulate submission (replace with Firestore addDoc in production)
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };

  const resetPastoralForm = () => {
    setRequestName(""); setRequestPhone(""); setRequestMessage("");
    setRequestUrgent(false); setSubmitted(false);
    setSelectedCategory(null); setPastoralModal(false);
  };

  /* ── CONTACT CHANNELS ─────────────────────────────────────── */
  const CONTACT_OPTIONS = [
    { icon: "logo-whatsapp",      label: "WhatsApp",     sub: "Chat with support",       color: "#25D366", onPress: () => Linking.openURL("https://wa.me/233200000000?text=Hi%20ChurchCare%20Support") },
    { icon: "call-outline",       label: "Phone",        sub: "+233 20 000 0000",         color: "#4B3F72", onPress: () => Linking.openURL("tel:+233200000000") },
    { icon: "mail-outline",       label: "Email",        sub: "support@churchcare.app",   color: "#0984E3", onPress: () => Linking.openURL("mailto:support@churchcare.app?subject=ChurchCare%20Support") },
    { icon: "chatbubble-outline", label: "SMS",          sub: "Text us anytime",          color: "#E17055", onPress: () => Linking.openURL("sms:+233200000000?body=Hi%20ChurchCare%20Support") },
    { icon: "globe-outline",      label: "Website",      sub: "www.churchcare.app/help",  color: "#636e72", onPress: () => Linking.openURL("https://www.churchcare.app/help") },
    { icon: "person-outline",     label: "Speak to Pastor", sub: "Request a personal meeting", color: "#6C5CE7", onPress: () => { setActiveTab("pastoral"); } },
  ];

  const filteredFaqs = FAQS.filter(f =>
    !faqSearch || f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <SafeAreaView
  style={[
    styles.safe,
    {
      paddingTop:
        Platform.OS === "ios" ? 20 : 0,
    },
  ]}
>

      <StatusBar barStyle="light-content" backgroundColor="#4B3F72" />

      <AppHeader
  title="Help & Support"
  subtitle="We're here for you"
  onBack={() => navigation.goBack()}
/>

      {/* ── TAB BAR ── */}
      <View style={styles.tabBar}>
        {[
          { key: "ai",       label: "AI Assistant", icon: "sparkles-outline"       },
          { key: "pastoral", label: "Pastoral",     icon: "heart-outline"           },
          { key: "faq",      label: "FAQ",           icon: "help-circle-outline"    },
          { key: "contact",  label: "Contact",       icon: "call-outline"           },
        ].map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? "#4B3F72" : "#aaa"} />
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]} numberOfLines={1}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══ AI ASSISTANT TAB ══ */}
      {activeTab === "ai" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>

            {/* Intro banner */}
            <View style={styles.aiBanner}>
              <View style={styles.aiBannerIcon}>
                <Ionicons name="sparkles" size={20} color="#6C5CE7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiBannerTitle}>AI Church Assistant</Text>
                <Text style={styles.aiBannerSub}>Ask me anything about the app, church life, or how to get support.</Text>
              </View>
            </View>

            {/* Chat messages */}
            <ScrollView ref={chatRef} style={styles.chatScroll} contentContainerStyle={{ padding: 14, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
              {messages.map((msg, i) => (
                <View key={i} style={[styles.msgRow, msg.role === "user" && styles.msgRowUser]}>
                  {msg.role === "assistant" && (
                    <View style={styles.botAvatar}>
                      <Ionicons name="sparkles" size={14} color="#6C5CE7" />
                    </View>
                  )}
                  <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
                    <Text style={[styles.bubbleText, msg.role === "user" && { color: "#fff" }]}>{msg.text}</Text>
                    <Text style={[styles.bubbleTime, msg.role === "user" && { color: "rgba(255,255,255,0.6)" }]}>{fmtTime(msg.time)}</Text>
                  </View>
                </View>
              ))}
              {aiLoading && (
                <View style={styles.msgRow}>
                  <View style={styles.botAvatar}><Ionicons name="sparkles" size={14} color="#6C5CE7" /></View>
                  <View style={[styles.bubble, styles.bubbleBot, { flexDirection: "row", gap: 6, paddingVertical: 12 }]}>
                    <ActivityIndicator size="small" color="#6C5CE7" />
                    <Text style={{ color: "#888", fontSize: 12 }}>Thinking…</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
                {["How do I mark attendance?","How do I give/donate?","I need prayer support","I need to speak to a pastor","How do I update my profile?"].map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => { setUserInput(s); }}>
                    <Text style={styles.suggestChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type your message…"
                placeholderTextColor="#bbb"
                value={userInput}
                onChangeText={setUserInput}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity style={[styles.sendBtn, (!userInput.trim() || aiLoading) && { opacity: 0.4 }]}
                onPress={sendMessage} disabled={!userInput.trim() || aiLoading}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Escalation prompt */}
            <TouchableOpacity style={styles.escalateRow} onPress={() => setActiveTab("contact")}>
              <Ionicons name="alert-circle-outline" size={14} color="#E11D48" />
              <Text style={styles.escalateText}>Not satisfied? <Text style={{ fontWeight: "800", color: "#E11D48" }}>Contact our team directly →</Text></Text>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      )}

      {/* ══ PASTORAL & WELFARE TAB ══ */}
      {activeTab === "pastoral" && (
        <ScrollView style={{ flex: 1, backgroundColor: "#f4f6fb" }} contentContainerStyle={{ padding: 14, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

          {/* Hero card */}
          <View style={styles.pastoralHero}>
            <Ionicons name="heart" size={28} color="#E11D48" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.pastoralHeroTitle}>Pastoral & Welfare Support</Text>
              <Text style={styles.pastoralHeroSub}>Our pastoral team is here to walk with you through every season of life. All conversations are confidential.</Text>
            </View>
          </View>

          {/* Urgent support banner */}
          <TouchableOpacity style={styles.urgentBanner} onPress={() => Linking.openURL("tel:+233200000000")}>
            <Ionicons name="warning-outline" size={18} color="#E11D48" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.urgentBannerTitle}>Need immediate help?</Text>
              <Text style={styles.urgentBannerSub}>Call our crisis line: +233 20 000 0000</Text>
            </View>
            <Ionicons name="call" size={20} color="#E11D48" />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>How can we support you?</Text>

          <View style={styles.pastoralGrid}>
            {PASTORAL_CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.key} style={[styles.pastoralCard, { borderLeftColor: cat.color }]}
                onPress={() => { setSelectedCategory(cat); setPastoralModal(true); }}>
                <View style={[styles.pastoralIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={22} color={cat.color} />
                </View>
                <Text style={styles.pastoralLabel}>{cat.label}</Text>
                <Text style={styles.pastoralDesc} numberOfLines={2}>{cat.desc}</Text>
                <View style={styles.pastoralArrow}>
                  <Text style={[styles.pastoralArrowText, { color: cat.color }]}>Request →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* What to expect */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>What to expect</Text>
            {[
              ["shield-checkmark-outline", "All requests are confidential"],
              ["time-outline",             "A pastor will respond within 24 hours"],
              ["call-outline",             "You may be contacted by phone or in person"],
              ["heart-circle-outline",     "Our team prays over every request"],
            ].map(([icon, text]) => (
              <View key={text} style={styles.infoRow}>
                <Ionicons name={icon} size={15} color="#4B3F72" />
                <Text style={styles.infoRowText}>{text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      )}

      {/* ══ FAQ TAB ══ */}
      {activeTab === "faq" && (
        <ScrollView style={{ flex: 1, backgroundColor: "#f4f6fb" }} contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>

          <View style={styles.faqSearch}>
            <Ionicons name="search-outline" size={15} color="#aaa" />
            <TextInput style={styles.faqSearchInput} placeholder="Search FAQs…" placeholderTextColor="#bbb"
              value={faqSearch} onChangeText={setFaqSearch} />
            {faqSearch.length > 0 && <TouchableOpacity onPress={() => setFaqSearch("")}><Ionicons name="close-circle" size={15} color="#ccc" /></TouchableOpacity>}
          </View>

          <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>

          {filteredFaqs.length === 0 && (
            <View style={styles.emptyFaq}>
              <Ionicons name="help-circle-outline" size={40} color="#ddd" />
              <Text style={styles.emptyFaqText}>No FAQs match your search. Try asking our AI assistant!</Text>
              <TouchableOpacity style={styles.askAiBtn} onPress={() => { setUserInput(faqSearch); setActiveTab("ai"); }}>
                <Ionicons name="sparkles-outline" size={14} color="#fff" />
                <Text style={styles.askAiBtnText}>Ask AI Assistant</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredFaqs.map((faq, i) => (
            <TouchableOpacity key={i} style={styles.faqCard} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqQ} numberOfLines={expandedFaq === i ? undefined : 2}>{faq.q}</Text>
                <Ionicons name={expandedFaq === i ? "chevron-up" : "chevron-down"} size={16} color="#4B3F72" />
              </View>
              {expandedFaq === i && (
                <View style={styles.faqBody}>
                  <Text style={styles.faqA}>{faq.a}</Text>
                  <TouchableOpacity style={styles.faqAskMore} onPress={() => { setUserInput(faq.q); setActiveTab("ai"); }}>
                    <Ionicons name="sparkles-outline" size={12} color="#6C5CE7" />
                    <Text style={styles.faqAskMoreText}>Ask AI for more detail</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

        </ScrollView>
      )}

      {/* ══ CONTACT TAB ══ */}
      {activeTab === "contact" && (
        <ScrollView style={{ flex: 1, backgroundColor: "#f4f6fb" }} contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>

          <View style={styles.contactHero}>
            <Ionicons name="headset-outline" size={32} color="#4B3F72" />
            <Text style={styles.contactHeroTitle}>Get in Touch</Text>
            <Text style={styles.contactHeroSub}>Our support team is available Mon–Fri, 8am–6pm. For urgent pastoral care, call us anytime.</Text>
          </View>

          <Text style={styles.sectionLabel}>Contact Channels</Text>

          {CONTACT_OPTIONS.map((opt, i) => (
            <TouchableOpacity key={i} style={styles.contactCard} onPress={opt.onPress}>
              <View style={[styles.contactIcon, { backgroundColor: opt.color + "18" }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{opt.label}</Text>
                <Text style={styles.contactSub}>{opt.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}

          {/* Report a bug */}
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>App Issues</Text>
          <TouchableOpacity style={styles.bugCard}
            onPress={() => Linking.openURL("mailto:bugs@churchcare.app?subject=Bug%20Report&body=Describe%20the%20issue%3A%0A%0ASteps%20to%20reproduce%3A%0A%0ADevice%3A")}>
            <Ionicons name="bug-outline" size={22} color="#e74c3c" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bugTitle}>Report a Bug</Text>
              <Text style={styles.bugSub}>Help us improve ChurchCare by reporting issues</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>

          {/* Office hours */}
          <View style={styles.hoursCard}>
            <Ionicons name="time-outline" size={18} color="#4B3F72" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.hoursTitle}>Support Hours</Text>
              {[["Monday – Friday","8:00 AM – 6:00 PM"],["Saturday","9:00 AM – 2:00 PM"],["Sunday","After service only"],["Pastoral Emergency","24 / 7 — Call hotline"]].map(([day, time]) => (
                <View key={day} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{day}</Text>
                  <Text style={styles.hoursTime}>{time}</Text>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
      )}

      {/* ══ PASTORAL REQUEST MODAL ══ */}
      <Modal visible={pastoralModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            {!submitted ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {selectedCategory && (
                  <View style={[styles.modalCatHeader, { backgroundColor: selectedCategory.bg }]}>
                    <Ionicons name={selectedCategory.icon} size={24} color={selectedCategory.color} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.modalCatTitle, { color: selectedCategory.color }]}>{selectedCategory.label}</Text>
                      <Text style={styles.modalCatDesc}>{selectedCategory.desc}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.modalConfidential}>🔒 All requests are strictly confidential</Text>

                <Text style={styles.fieldLabel}>Your Name *</Text>
                <TextInput style={styles.input} placeholder="Full name" value={requestName} onChangeText={setRequestName} />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput style={styles.input} placeholder="For follow-up (optional)" keyboardType="phone-pad"
                  value={requestPhone} onChangeText={setRequestPhone} />

                <Text style={styles.fieldLabel}>How can we help you? *</Text>
                <TextInput style={[styles.input, { height: 110, textAlignVertical: "top" }]}
                  placeholder="Share as much or as little as you're comfortable with. Our team is here to listen…"
                  value={requestMessage} onChangeText={setRequestMessage} multiline />

                {/* Urgent toggle */}
                <TouchableOpacity style={styles.urgentToggle} onPress={() => setRequestUrgent(p => !p)}>
                  <Ionicons name={requestUrgent ? "checkbox" : "square-outline"} size={20} color={requestUrgent ? "#E11D48" : "#aaa"} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.urgentLabel, requestUrgent && { color: "#E11D48" }]}>This is urgent</Text>
                    <Text style={styles.urgentSub}>A pastor will prioritise your request</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, (submitting || !requestName.trim() || !requestMessage.trim()) && { opacity: 0.5 }]}
                  onPress={submitPastoralRequest}
                  disabled={submitting || !requestName.trim() || !requestMessage.trim()}>
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="send-outline" size={16} color="#fff" /><Text style={styles.submitBtnText}>Submit Request</Text></>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={resetPastoralForm}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

              </ScrollView>
            ) : (
              // Success state
              <View style={styles.successState}>
                <View style={styles.successIcon}><Ionicons name="checkmark-circle" size={52} color="#00B894" /></View>
                <Text style={styles.successTitle}>Request Submitted</Text>
                <Text style={styles.successText}>
                  Thank you, {requestName.split(" ")[0]}. Our pastoral team has received your request
                  {requestUrgent ? " and has been marked urgent" : ""}. A pastor will be in touch with you shortly.
                </Text>
                <Text style={styles.successScripture}>"Cast all your anxiety on him because he cares for you." — 1 Peter 5:7</Text>
                <TouchableOpacity style={styles.submitBtn} onPress={resetPastoralForm}>
                  <Text style={styles.submitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#4B3F72" },

  header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 14,
  paddingBottom: 10,
  paddingTop: Platform.OS === "ios" ? 20 : 4,
  gap: 10,
},
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  clearBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  tabBar: { flexDirection: "row", backgroundColor: "#f4f6fb", paddingVertical: 8, paddingHorizontal: 12, gap: 6 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: "#fff", gap: 4, elevation: 1 },
  tabBtnActive: { backgroundColor: "#EEF0FA", borderWidth: 1.5, borderColor: "#4B3F72" },
  tabBtnText: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  tabBtnTextActive: { color: "#4B3F72", fontWeight: "800" },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },

  // ── AI Chat ──
  aiBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0EEFF", margin: 14, padding: 14, borderRadius: 14, gap: 10 },
  aiBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", elevation: 2 },
  aiBannerTitle: { fontSize: 14, fontWeight: "800", color: "#4B3F72" },
  aiBannerSub: { fontSize: 12, color: "#6C5CE7", marginTop: 2, lineHeight: 17 },

  chatScroll: { flex: 1 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  botAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F0EEFF", alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: W * 0.75, borderRadius: 16, padding: 12 },
  bubbleBot: { backgroundColor: "#fff", borderBottomLeftRadius: 4, elevation: 1 },
  bubbleUser: { backgroundColor: "#4B3F72", borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 13, color: "#333", lineHeight: 19 },
  bubbleTime: { fontSize: 10, color: "#aaa", marginTop: 4, alignSelf: "flex-end" },

  suggestScroll: { maxHeight: 46, marginBottom: 6 },
  suggestChip: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: "#e8e8e8" },
  suggestChipText: { fontSize: 12, color: "#4B3F72", fontWeight: "600" },

  inputBar: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0", gap: 10 },
  chatInput: { flex: 1, fontSize: 13, color: "#222", maxHeight: 90, paddingTop: 0 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#4B3F72", alignItems: "center", justifyContent: "center" },
  escalateRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  escalateText: { fontSize: 12, color: "#666" },

  // ── Pastoral ──
  pastoralHero: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  pastoralHeroTitle: { fontSize: 15, fontWeight: "800", color: "#222" },
  pastoralHeroSub: { fontSize: 12, color: "#666", marginTop: 4, lineHeight: 18 },

  urgentBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF1F2", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: "#fce8e8" },
  urgentBannerTitle: { fontSize: 13, fontWeight: "800", color: "#E11D48" },
  urgentBannerSub: { fontSize: 11, color: "#888", marginTop: 2 },

  pastoralGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  pastoralCard: { width: (W - 38) / 2, backgroundColor: "#fff", borderRadius: 14, padding: 14, borderLeftWidth: 4, elevation: 2 },
  pastoralIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  pastoralLabel: { fontSize: 13, fontWeight: "800", color: "#222", marginBottom: 4 },
  pastoralDesc: { fontSize: 11, color: "#888", lineHeight: 16 },
  pastoralArrow: { marginTop: 8 },
  pastoralArrowText: { fontSize: 11, fontWeight: "700" },

  infoCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  infoCardTitle: { fontSize: 13, fontWeight: "800", color: "#222", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  infoRowText: { fontSize: 13, color: "#444", flex: 1 },

  // ── FAQ ──
  faqSearch: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12, elevation: 1 },
  faqSearchInput: { flex: 1, fontSize: 13, color: "#222", padding: 0 },
  faqCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  faqHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "700", color: "#222" },
  faqBody: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  faqA: { fontSize: 13, color: "#444", lineHeight: 20 },
  faqAskMore: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  faqAskMoreText: { fontSize: 11, color: "#6C5CE7", fontWeight: "600" },
  emptyFaq: { alignItems: "center", padding: 30 },
  emptyFaqText: { fontSize: 13, color: "#aaa", textAlign: "center", marginTop: 10, marginBottom: 16 },
  askAiBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#6C5CE7", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, gap: 6 },
  askAiBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // ── Contact ──
  contactHero: { alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, elevation: 1 },
  contactHeroTitle: { fontSize: 17, fontWeight: "800", color: "#222", marginTop: 8 },
  contactHeroSub: { fontSize: 12, color: "#888", textAlign: "center", marginTop: 6, lineHeight: 18 },
  contactCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, gap: 12 },
  contactIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 14, fontWeight: "700", color: "#222" },
  contactSub: { fontSize: 12, color: "#888", marginTop: 2 },
  bugCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF1F2", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: "#fce8e8" },
  bugTitle: { fontSize: 14, fontWeight: "700", color: "#e74c3c" },
  bugSub: { fontSize: 11, color: "#888", marginTop: 2 },
  hoursCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, padding: 16, elevation: 1 },
  hoursTitle: { fontSize: 14, fontWeight: "800", color: "#222", marginBottom: 8 },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  hoursDay: { fontSize: 12, color: "#555", fontWeight: "600" },
  hoursTime: { fontSize: 12, color: "#4B3F72", fontWeight: "700" },

  // ── Pastoral Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "90%", paddingBottom: Platform.OS === "ios" ? 36 : 24 },
  sheetHandle: { width: 36, height: 4, backgroundColor: "#ddd", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalCatHeader: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 14, marginBottom: 12 },
  modalCatTitle: { fontSize: 15, fontWeight: "800" },
  modalCatDesc: { fontSize: 12, color: "#555", marginTop: 2, lineHeight: 17 },
  modalConfidential: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#aaa", textTransform: "uppercase", marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, fontSize: 13, color: "#222", borderWidth: 1.5, borderColor: "#eee" },
  urgentToggle: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF1F2", borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1.5, borderColor: "#fce8e8" },
  urgentLabel: { fontSize: 14, fontWeight: "700", color: "#444" },
  urgentSub: { fontSize: 11, color: "#888", marginTop: 2 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#4B3F72", borderRadius: 12, padding: 14, marginTop: 16, gap: 8 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelBtn: { alignItems: "center", padding: 12, marginTop: 4 },
  cancelBtnText: { color: "#888", fontSize: 13 },

  successState: { alignItems: "center", paddingVertical: 20 },
  successIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#E8FBF5", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: "900", color: "#222", marginBottom: 10 },
  successText: { fontSize: 13, color: "#555", textAlign: "center", lineHeight: 20, marginBottom: 14 },
  successScripture: { fontSize: 12, color: "#4B3F72", fontStyle: "italic", textAlign: "center", paddingHorizontal: 20, marginBottom: 20, lineHeight: 18 },
});

