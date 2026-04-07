import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  MessageCircle, User, Bot, CheckCircle, Clock, AlertCircle,
  Send, Settings, RefreshCw, ChevronLeft, Phone,
  UserCheck, HelpCircle, Check, ToggleLeft, ToggleRight,
} from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useQueryClient } from '@tanstack/react-query';

type ConvStatus = 'active' | 'pending_human' | 'resolved' | 'all';
type ConvUserType = 'customer' | 'restaurant_owner' | 'unknown' | 'all';
type ActiveSection = 'inbox' | 'conversation' | 'settings';

interface Conversation {
  id: string;
  userPhone: string;
  userName: string | null;
  userType: string;
  status: string;
  aiResponseCount: number;
  lastMessage: string | null;
  totalMessages: number;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  direction: string;
  content: string;
  sentByAi: boolean;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  pending_human: '#f59e0b',
  resolved: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  pending_human: 'Pendiente',
  resolved: 'Resuelta',
};

const USER_TYPE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  restaurant_owner: 'Restaurante',
  unknown: 'Desconocido',
};

const USER_TYPE_COLORS: Record<string, string> = {
  customer: '#3b82f6',
  restaurant_owner: '#8b5cf6',
  unknown: '#9ca3af',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return '';
  }
}

function formatFullTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export default function WhatsappInboxScreen() {
  const [section, setSection] = useState<ActiveSection>('inbox');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConvStatus>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<ConvUserType>('all');
  const [replyText, setReplyText] = useState<string>('');
  const scrollRef = useRef<ScrollView>(null);
  useQueryClient();

  const conversationsQuery = trpc.chatbot.listConversations.useQuery(
    { status: statusFilter, userType: userTypeFilter, limit: 100, offset: 0 },
    { refetchInterval: 15000 }
  );

  const conversationQuery = trpc.chatbot.getConversation.useQuery(
    { id: selectedConvId! },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );

  const settingsQuery = trpc.chatbot.getSettings.useQuery(
    undefined,
    { enabled: section === 'settings' }
  );

  const replyMutation = trpc.chatbot.reply.useMutation({
    onSuccess: () => {
      setReplyText('');
      void conversationQuery.refetch();
      void conversationsQuery.refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const markResolvedMutation = trpc.chatbot.markResolved.useMutation({
    onSuccess: () => {
      void conversationsQuery.refetch();
      void conversationQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const updateSettingsMutation = trpc.chatbot.updateSettings.useMutation({
    onSuccess: () => {
      Alert.alert('Guardado', 'Configuración actualizada correctamente');
      void settingsQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const [settingsEnabled, setSettingsEnabled] = useState<boolean>(true);
  const [settingsVerifyToken, setSettingsVerifyToken] = useState<string>('');
  const [settingsMaxMessages, setSettingsMaxMessages] = useState<string>('8');
  const [settingsWelcomeCustomer, setSettingsWelcomeCustomer] = useState<string>('');
  const [settingsWelcomeOwner, setSettingsWelcomeOwner] = useState<string>('');
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);

  React.useEffect(() => {
    if (settingsQuery.data && !settingsLoaded) {
      const s = settingsQuery.data;
      setSettingsEnabled(s.enabled);
      setSettingsVerifyToken(s.verifyToken);
      setSettingsMaxMessages(String(s.autoDeriveAfterMessages));
      setSettingsWelcomeCustomer(s.welcomeMessageCustomer);
      setSettingsWelcomeOwner(s.welcomeMessageOwner);
      setSettingsLoaded(true);
    }
  }, [settingsQuery.data, settingsLoaded]);

  React.useEffect(() => {
    if (section === 'settings') setSettingsLoaded(false);
  }, [section]);

  const handleOpenConversation = useCallback((convId: string) => {
    setSelectedConvId(convId);
    setSection('conversation');
    setReplyText('');
  }, []);

  const handleBack = useCallback(() => {
    setSection('inbox');
    setSelectedConvId(null);
    void conversationsQuery.refetch();
  }, [conversationsQuery]);

  const handleSendReply = useCallback(() => {
    if (!selectedConvId || !replyText.trim()) return;
    replyMutation.mutate({ conversationId: selectedConvId, message: replyText.trim() });
  }, [selectedConvId, replyText, replyMutation]);

  const handleMarkStatus = useCallback((status: 'resolved' | 'active' | 'pending_human') => {
    if (!selectedConvId) return;
    markResolvedMutation.mutate({ conversationId: selectedConvId, status });
  }, [selectedConvId, markResolvedMutation]);

  const handleSaveSettings = useCallback(() => {
    updateSettingsMutation.mutate({
      enabled: settingsEnabled,
      verifyToken: settingsVerifyToken,
      autoDeriveAfterMessages: parseInt(settingsMaxMessages, 10) || 8,
      welcomeMessageCustomer: settingsWelcomeCustomer,
      welcomeMessageOwner: settingsWelcomeOwner,
    });
  }, [settingsEnabled, settingsVerifyToken, settingsMaxMessages, settingsWelcomeCustomer, settingsWelcomeOwner, updateSettingsMutation]);

  const pendingCount = (conversationsQuery.data?.conversations || []).filter(c => c.status === 'pending_human').length;

  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6b7280';
    const typeColor = USER_TYPE_COLORS[item.userType] || '#9ca3af';
    return (
      <TouchableOpacity
        style={styles.convItem}
        onPress={() => handleOpenConversation(item.id)}
        activeOpacity={0.7}
        testID={`conv-item-${item.id}`}
      >
        <View style={[styles.convAvatar, { backgroundColor: typeColor + '20' }]}>
          {item.userType === 'customer' ? (
            <User size={22} color={typeColor} strokeWidth={2} />
          ) : item.userType === 'restaurant_owner' ? (
            <UserCheck size={22} color={typeColor} strokeWidth={2} />
          ) : (
            <HelpCircle size={22} color={typeColor} strokeWidth={2} />
          )}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convRow}>
            <Text style={styles.convPhone} numberOfLines={1}>
              {item.userName || item.userPhone}
            </Text>
            <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <View style={styles.convRow}>
            <Text style={styles.convLastMsg} numberOfLines={1}>
              {item.lastMessage || 'Sin mensajes'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          </View>
          <View style={styles.convMeta}>
            <View style={[styles.typePill, { backgroundColor: typeColor + '15' }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>
                {USER_TYPE_LABELS[item.userType] || item.userType}
              </Text>
            </View>
            <Text style={styles.convCount}>{item.totalMessages} msg · IA: {item.aiResponseCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleOpenConversation]);

  const selectedConv = conversationQuery.data;

  return (
    <>
      <Stack.Screen
        options={{
          title: section === 'settings' ? 'Configuración Chatbot' : section === 'conversation' ? 'Conversación' : 'Bandeja WhatsApp',
          headerStyle: { backgroundColor: '#075e54' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
          headerLeft: section !== 'inbox' ? () => (
            <TouchableOpacity onPress={section === 'conversation' ? handleBack : () => setSection('inbox')} style={styles.backBtn}>
              <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : undefined,
          headerRight: section === 'inbox' ? () => (
            <View style={styles.headerRight}>
              {pendingCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{pendingCount}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setSection('settings')} style={styles.headerBtn}>
                <Settings size={20} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void conversationsQuery.refetch()} style={styles.headerBtn}>
                <RefreshCw size={20} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ) : undefined,
        }}
      />

      {section === 'inbox' && (
        <View style={styles.container}>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'active', 'pending_human', 'resolved'] as ConvStatus[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                    {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
                    {s === 'pending_human' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {(['all', 'customer', 'restaurant_owner', 'unknown'] as ConvUserType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, userTypeFilter === t && styles.filterChipActive]}
                  onPress={() => setUserTypeFilter(t)}
                >
                  <Text style={[styles.filterChipText, userTypeFilter === t && styles.filterChipTextActive]}>
                    {t === 'all' ? 'Todos' : USER_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {conversationsQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#075e54" />
              <Text style={styles.loadingText}>Cargando conversaciones...</Text>
            </View>
          ) : conversationsQuery.error ? (
            <View style={styles.centered}>
              <AlertCircle size={40} color="#ef4444" strokeWidth={2} />
              <Text style={styles.errorText}>Error cargando conversaciones</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void conversationsQuery.refetch()}>
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (conversationsQuery.data?.conversations || []).length === 0 ? (
            <View style={styles.centered}>
              <MessageCircle size={48} color="#d1d5db" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Sin conversaciones</Text>
              <Text style={styles.emptySubtitle}>Los mensajes de WhatsApp aparecerán aquí cuando los usuarios te escriban</Text>
              <Text style={styles.webhookHint}>Webhook: /api/webhooks/whatsapp</Text>
            </View>
          ) : (
            <FlatList
              data={conversationsQuery.data?.conversations as Conversation[]}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              refreshControl={
                <RefreshControl
                  refreshing={conversationsQuery.isFetching}
                  onRefresh={() => void conversationsQuery.refetch()}
                  colors={['#075e54']}
                />
              }
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          {conversationsQuery.data && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {conversationsQuery.data.total} conversaciones · Actualiza cada 15s
              </Text>
            </View>
          )}
        </View>
      )}

      {section === 'conversation' && selectedConvId && (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {conversationQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#075e54" />
            </View>
          ) : conversationQuery.error ? (
            <View style={styles.centered}>
              <AlertCircle size={40} color="#ef4444" strokeWidth={2} />
              <Text style={styles.errorText}>Error cargando conversación</Text>
            </View>
          ) : selectedConv ? (
            <>
              <View style={styles.convHeader}>
                <View style={styles.convHeaderLeft}>
                  <View style={[styles.convAvatar, { backgroundColor: USER_TYPE_COLORS[selectedConv.userType] + '20' }]}>
                    {selectedConv.userType === 'customer' ? (
                      <User size={20} color={USER_TYPE_COLORS[selectedConv.userType]} strokeWidth={2} />
                    ) : selectedConv.userType === 'restaurant_owner' ? (
                      <UserCheck size={20} color={USER_TYPE_COLORS[selectedConv.userType]} strokeWidth={2} />
                    ) : (
                      <HelpCircle size={20} color={USER_TYPE_COLORS[selectedConv.userType]} strokeWidth={2} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.convHeaderName}>{selectedConv.userName || selectedConv.userPhone}</Text>
                    <View style={styles.convHeaderMeta}>
                      <Phone size={11} color="#6b7280" strokeWidth={2} />
                      <Text style={styles.convHeaderPhone}>{selectedConv.userPhone}</Text>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[selectedConv.status] || '#6b7280', marginLeft: 6 }]} />
                      <Text style={[styles.convHeaderStatus, { color: STATUS_COLORS[selectedConv.status] || '#6b7280' }]}>
                        {STATUS_LABELS[selectedConv.status] || selectedConv.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.convHeaderActions}>
                  {selectedConv.status !== 'resolved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnGreen]}
                      onPress={() => handleMarkStatus('resolved')}
                    >
                      <Check size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.actionBtnText}>Resolver</Text>
                    </TouchableOpacity>
                  )}
                  {selectedConv.status === 'resolved' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnBlue]}
                      onPress={() => handleMarkStatus('active')}
                    >
                      <RefreshCw size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.actionBtnText}>Reabrir</Text>
                    </TouchableOpacity>
                  )}
                  {selectedConv.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnYellow]}
                      onPress={() => handleMarkStatus('pending_human')}
                    >
                      <Clock size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.actionBtnText}>Pendiente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              >
                {(selectedConv.messages as Message[]).map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <View
                      key={msg.id}
                      style={[styles.msgWrapper, isOutbound ? styles.msgWrapperOut : styles.msgWrapperIn]}
                    >
                      {!isOutbound && (
                        <View style={styles.msgAvatarSmall}>
                          <User size={14} color="#6b7280" strokeWidth={2} />
                        </View>
                      )}
                      <View style={[styles.msgBubble, isOutbound ? styles.msgBubbleOut : styles.msgBubbleIn]}>
                        <Text style={[styles.msgText, isOutbound ? styles.msgTextOut : styles.msgTextIn]}>
                          {msg.content}
                        </Text>
                        <View style={styles.msgMeta}>
                          {isOutbound && (
                            <View style={styles.msgSentBy}>
                              {msg.sentByAi ? (
                                <Bot size={10} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                              ) : (
                                <User size={10} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                              )}
                              <Text style={styles.msgSentByText}>{msg.sentByAi ? 'IA' : 'Humano'}</Text>
                            </View>
                          )}
                          <Text style={[styles.msgTime, isOutbound ? styles.msgTimeOut : styles.msgTimeIn]}>
                            {formatFullTime(msg.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.replyBar}>
                <TextInput
                  style={styles.replyInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Escribe una respuesta manual..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={1000}
                  testID="reply-input"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!replyText.trim() || replyMutation.isPending) && styles.sendBtnDisabled]}
                  onPress={handleSendReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  testID="send-reply-btn"
                >
                  {replyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={20} color="#fff" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </KeyboardAvoidingView>
      )}

      {section === 'settings' && (
        <ScrollView style={styles.container} contentContainerStyle={styles.settingsContent}>
          {settingsQuery.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#075e54" />
            </View>
          ) : (
            <>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Estado del Chatbot</Text>
                <View style={styles.settingsRow}>
                  <View style={styles.settingsRowLeft}>
                    <Text style={styles.settingsLabel}>Respuestas automáticas (IA)</Text>
                    <Text style={styles.settingsDesc}>Activar o desactivar el chatbot de IA</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSettingsEnabled(!settingsEnabled)}>
                    {settingsEnabled ? (
                      <ToggleRight size={36} color="#075e54" strokeWidth={1.5} />
                    ) : (
                      <ToggleLeft size={36} color="#9ca3af" strokeWidth={1.5} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Configuración del Webhook</Text>
                <Text style={styles.settingsDesc}>
                  URL del webhook para Meta: {'\n'}
                  <Text style={styles.webhookUrl}>https://quieromesa.com/api/webhooks/whatsapp</Text>
                </Text>
                <View style={styles.settingsField}>
                  <Text style={styles.settingsLabel}>Verify Token</Text>
                  <TextInput
                    style={styles.settingsInput}
                    value={settingsVerifyToken}
                    onChangeText={setSettingsVerifyToken}
                    placeholder="quieromesa_webhook_token"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    testID="verify-token-input"
                  />
                </View>
                <View style={styles.settingsField}>
                  <Text style={styles.settingsLabel}>Derivar a humano después de N mensajes IA</Text>
                  <TextInput
                    style={styles.settingsInput}
                    value={settingsMaxMessages}
                    onChangeText={setSettingsMaxMessages}
                    keyboardType="number-pad"
                    placeholder="8"
                    placeholderTextColor="#9ca3af"
                    testID="max-messages-input"
                  />
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Mensajes de Bienvenida</Text>
                <View style={styles.settingsField}>
                  <View style={styles.settingsLabelRow}>
                    <User size={14} color="#3b82f6" strokeWidth={2} />
                    <Text style={[styles.settingsLabel, { color: '#3b82f6' }]}>Para clientes finales</Text>
                  </View>
                  <TextInput
                    style={[styles.settingsInput, styles.settingsTextarea]}
                    value={settingsWelcomeCustomer}
                    onChangeText={setSettingsWelcomeCustomer}
                    placeholder="Mensaje de bienvenida para clientes..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    testID="welcome-customer-input"
                  />
                </View>
                <View style={styles.settingsField}>
                  <View style={styles.settingsLabelRow}>
                    <UserCheck size={14} color="#8b5cf6" strokeWidth={2} />
                    <Text style={[styles.settingsLabel, { color: '#8b5cf6' }]}>Para dueños de restaurante</Text>
                  </View>
                  <TextInput
                    style={[styles.settingsInput, styles.settingsTextarea]}
                    value={settingsWelcomeOwner}
                    onChangeText={setSettingsWelcomeOwner}
                    placeholder="Mensaje de bienvenida para restaurantes..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    testID="welcome-owner-input"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, updateSettingsMutation.isPending && styles.saveBtnDisabled]}
                onPress={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                testID="save-settings-btn"
              >
                {updateSettingsMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" strokeWidth={2} />
                    <Text style={styles.saveBtnText}>Guardar Configuración</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  errorText: { marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#075e54', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600' as const, fontSize: 14 },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '600' as const, color: '#374151' },
  emptySubtitle: { marginTop: 8, fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  webhookHint: { marginTop: 12, fontSize: 11, color: '#075e54', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: '#e6f4f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  backBtn: { paddingHorizontal: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 8, marginLeft: 4 },
  headerBadge: { backgroundColor: '#f59e0b', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 4 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  filterRow: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterScroll: { paddingHorizontal: 12, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterChipActive: { backgroundColor: '#075e54', borderColor: '#075e54' },
  filterChipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' as const },
  filterChipTextActive: { color: '#fff' },
  listContent: { paddingBottom: 16 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 72 },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  convInfo: { flex: 1 },
  convRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  convPhone: { fontSize: 15, fontWeight: '600' as const, color: '#111827', flex: 1, marginRight: 8 },
  convTime: { fontSize: 11, color: '#9ca3af' },
  convLastMsg: { fontSize: 13, color: '#6b7280', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 3 },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  convMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 },
  typePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  typeText: { fontSize: 10, fontWeight: '600' as const },
  convCount: { fontSize: 11, color: '#9ca3af' },
  footer: { padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' },
  footerText: { fontSize: 11, color: '#9ca3af' },
  convHeader: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  convHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  convHeaderName: { fontSize: 14, fontWeight: '700' as const, color: '#111827' },
  convHeaderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  convHeaderPhone: { fontSize: 11, color: '#6b7280', marginLeft: 3 },
  convHeaderStatus: { fontSize: 11, fontWeight: '600' as const, marginLeft: 2 },
  convHeaderActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, gap: 3 },
  actionBtnGreen: { backgroundColor: '#10b981' },
  actionBtnBlue: { backgroundColor: '#3b82f6' },
  actionBtnYellow: { backgroundColor: '#f59e0b' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' as const },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 12, paddingBottom: 16 },
  msgWrapper: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  msgWrapperIn: { justifyContent: 'flex-start' },
  msgWrapperOut: { justifyContent: 'flex-end' },
  msgAvatarSmall: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2 },
  msgBubble: { maxWidth: '78%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  msgBubbleIn: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  msgBubbleOut: { backgroundColor: '#075e54', borderBottomRightRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextIn: { color: '#111827' },
  msgTextOut: { color: '#fff' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, gap: 4 },
  msgSentBy: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  msgSentByText: { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  msgTime: { fontSize: 10 },
  msgTimeIn: { color: '#9ca3af' },
  msgTimeOut: { color: 'rgba(255,255,255,0.65)' },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  replyInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100, minHeight: 40 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#075e54', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
  settingsContent: { padding: 16, paddingBottom: 40 },
  settingsSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  settingsSectionTitle: { fontSize: 13, fontWeight: '700' as const, color: '#374151', marginBottom: 12, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsRowLeft: { flex: 1, marginRight: 12 },
  settingsLabel: { fontSize: 14, fontWeight: '600' as const, color: '#111827' },
  settingsDesc: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 17 },
  settingsField: { marginBottom: 12 },
  settingsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  settingsInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  settingsTextarea: { minHeight: 72, textAlignVertical: 'top' as const },
  webhookUrl: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#075e54', fontSize: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#075e54', borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 4 },
  saveBtnDisabled: { backgroundColor: '#9ca3af' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
});
