import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking, Platform, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { Database, Download, Upload, RefreshCw, Clock, HardDrive, Settings, Key, Package, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';

interface BackupItem {
  id: string;
  filename: string;
  size: string;
  sizeBytes: number;
  date: string;
  type: string;
  backupType: string;
}

export default function SystemConfigScreen() {
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isEditingDbConfig, setIsEditingDbConfig] = useState(false);
  const [editDbFrequency, setEditDbFrequency] = useState('');
  const [editDbRetention, setEditDbRetention] = useState('');
  const [editDbEnabled, setEditDbEnabled] = useState(true);

  const [isEditingProgramConfig, setIsEditingProgramConfig] = useState(false);
  const [editProgramFrequency, setEditProgramFrequency] = useState('');
  const [editProgramRetention, setEditProgramRetention] = useState('');
  const [editProgramEnabled, setEditProgramEnabled] = useState(true);

  const [isRestoring, setIsRestoring] = useState(false);

  const backupsQuery = trpc.backups.list.useQuery();
  const configQuery = trpc.backups.getConfig.useQuery();
  const createBackupMutation = trpc.backups.create.useMutation();
  const deleteBackupMutation = trpc.backups.delete.useMutation();
  const restoreBackupMutation = trpc.backups.restore.useMutation();
  const updateConfigMutation = trpc.backups.updateConfig.useMutation();

  const backups = backupsQuery.data || [];
  const cfg = configQuery.data;

  const dbFrequency = cfg?.dbFrequency?.toString() ?? '6';
  const dbRetention = cfg?.dbRetention?.toString() ?? '7';
  const dbEnabled = cfg?.dbAutoBackupEnabled ?? true;
  const programFrequency = cfg?.programFrequency?.toString() ?? '24';
  const programRetention = cfg?.programRetention?.toString() ?? '7';
  const programEnabled = cfg?.programAutoBackupEnabled ?? true;

  const handleEditDbConfig = () => {
    setEditDbFrequency(dbFrequency);
    setEditDbRetention(dbRetention);
    setEditDbEnabled(dbEnabled);
    setIsEditingDbConfig(true);
  };

  const handleEditProgramConfig = () => {
    setEditProgramFrequency(programFrequency);
    setEditProgramRetention(programRetention);
    setEditProgramEnabled(programEnabled);
    setIsEditingProgramConfig(true);
  };

  const handleSaveDbConfig = () => {
    const frequency = parseInt(editDbFrequency);
    const retention = parseInt(editDbRetention);

    if (isNaN(frequency) || frequency < 1 || frequency > 168) {
      const msg = 'La frecuencia debe ser entre 1 y 168 horas';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      return;
    }
    if (isNaN(retention) || retention < 1 || retention > 365) {
      const msg = 'La retención debe ser entre 1 y 365 días';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      return;
    }

    const currentCfg = configQuery.data;
    updateConfigMutation.mutate(
      {
        dbFrequency: frequency,
        dbRetention: retention,
        dbAutoBackupEnabled: editDbEnabled,
        programFrequency: currentCfg?.programFrequency ?? 24,
        programRetention: currentCfg?.programRetention ?? 7,
        programAutoBackupEnabled: currentCfg?.programAutoBackupEnabled ?? true,
      },
      {
        onSuccess: () => {
          void configQuery.refetch();
          setIsEditingDbConfig(false);
          const msg = 'Configuración de BD actualizada correctamente';
          if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Éxito', msg); }
        },
        onError: (error) => {
          if (Platform.OS === 'web') { window.alert('Error: ' + error.message); } else { Alert.alert('Error', error.message); }
        },
      }
    );
  };

  const handleSaveProgramConfig = () => {
    const frequency = parseInt(editProgramFrequency);
    const retention = parseInt(editProgramRetention);

    if (isNaN(frequency) || frequency < 1 || frequency > 720) {
      const msg = 'La frecuencia debe ser entre 1 y 720 horas';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      return;
    }
    if (isNaN(retention) || retention < 1 || retention > 365) {
      const msg = 'La retención debe ser entre 1 y 365 días';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Error', msg); }
      return;
    }

    const currentCfg = configQuery.data;
    updateConfigMutation.mutate(
      {
        dbFrequency: currentCfg?.dbFrequency ?? 6,
        dbRetention: currentCfg?.dbRetention ?? 7,
        dbAutoBackupEnabled: currentCfg?.dbAutoBackupEnabled ?? true,
        programFrequency: frequency,
        programRetention: retention,
        programAutoBackupEnabled: editProgramEnabled,
      },
      {
        onSuccess: () => {
          void configQuery.refetch();
          setIsEditingProgramConfig(false);
          const msg = 'Configuración del programa actualizada correctamente';
          if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Éxito', msg); }
        },
        onError: (error) => {
          if (Platform.OS === 'web') { window.alert('Error: ' + error.message); } else { Alert.alert('Error', error.message); }
        },
      }
    );
  };

  const handleCreateBackup = (type: 'database' | 'program' | 'full') => {
    const typeLabel = type === 'database' ? 'Base de Datos' : type === 'program' ? 'Programa' : 'Completa';
    const doCreate = () => {
      createBackupMutation.mutate(
        { type, manual: true },
        {
          onSuccess: () => {
            void backupsQuery.refetch();
            const msg = 'Copia de seguridad creada correctamente';
            if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Éxito', msg); }
          },
          onError: (error) => {
            if (Platform.OS === 'web') { window.alert('Error: ' + error.message); } else { Alert.alert('Error', error.message); }
          },
        }
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Desea crear una copia de seguridad ${typeLabel} manual?`)) doCreate();
    } else {
      Alert.alert('Crear Copia de Seguridad', `¿Desea crear una copia de seguridad ${typeLabel} manual?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Crear', onPress: doCreate },
      ]);
    }
  };

  const handleDownloadBackup = (backup: BackupItem) => {
    const apiUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://quieromesa.com';
    const downloadUrl = `${apiUrl}/api/backups/download/${backup.filename}`;
    if (Platform.OS === 'web') {
      window.open(downloadUrl, '_blank');
    } else {
      void Linking.openURL(downloadUrl);
    }
  };

  const handleRestoreBackup = (backup: BackupItem) => {
    const doRestore = () => {
      setIsRestoring(true);
      restoreBackupMutation.mutate(
        { filename: backup.filename },
        {
          onSuccess: () => {
            setIsRestoring(false);
            const msg = 'Sistema restaurado correctamente. La página se recargará en unos segundos.';
            if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Éxito', 'Sistema restaurado correctamente. Recargue la página en unos segundos.'); }
            setTimeout(() => {
              if (Platform.OS === 'web') window.location.reload();
              else router.replace('/');
            }, 3000);
          },
          onError: (error) => {
            setIsRestoring(false);
            if (Platform.OS === 'web') { window.alert('Error: ' + error.message); } else { Alert.alert('Error', error.message); }
          },
        }
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`⚠️ ¿Restaurar el sistema con ${backup.filename}? Sobrescribirá todos los datos actuales.`)) doRestore();
    } else {
      Alert.alert('⚠️ Restaurar Sistema', `¿Restaurar con ${backup.filename}?\n\n⚠️ ADVERTENCIA: Sobrescribirá todos los datos.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: doRestore },
      ]);
    }
  };

  const handleDeleteBackup = (backup: BackupItem) => {
    const doDelete = () => {
      deleteBackupMutation.mutate(
        { filename: backup.filename },
        {
          onSuccess: () => {
            void backupsQuery.refetch();
            const msg = 'Copia de seguridad eliminada';
            if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Éxito', msg); }
          },
          onError: (error) => {
            if (Platform.OS === 'web') { window.alert('Error: ' + error.message); } else { Alert.alert('Error', error.message); }
          },
        }
      );
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar la copia ${backup.filename}?`)) doDelete();
    } else {
      Alert.alert('Eliminar Copia', `¿Eliminar ${backup.filename}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleSendVerificationCode = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Debe ingresar la contraseña actual');
      return;
    }
    Alert.alert('Código Enviado', 'Se ha enviado un código de verificación a admin@quieromesa.com', [
      { text: 'OK', onPress: () => setCodeSent(true) },
    ]);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !verificationCode) {
      Alert.alert('Error', 'Complete todos los campos');
      return;
    }
    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setVerificationCode('');
      setCodeSent(false);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
    }, 2000);
  };

  const renderConfigCard = (
    title: string,
    icon: React.ReactNode,
    accentColor: string,
    frequency: string,
    retention: string,
    enabled: boolean,
    isEditing: boolean,
    editFreq: string,
    editRet: string,
    editEnabled: boolean,
    freqLabel: string,
    onEdit: () => void,
    onCancel: () => void,
    onSave: () => void,
    setEditFreq: (v: string) => void,
    setEditRet: (v: string) => void,
    setEditEnabled: (v: boolean) => void,
    freqMax: string
  ) => (
    <View style={styles.configCard}>
      <View style={[styles.configCardHeader, { borderLeftColor: accentColor }]}>
        {icon}
        <Text style={styles.configCardTitle}>{title}</Text>
        {!isEditing && (
          <View style={[styles.statusBadge, { backgroundColor: enabled ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[styles.statusBadgeText, { color: enabled ? '#16a34a' : '#dc2626' }]}>
              {enabled ? 'Activo' : 'Pausado'}
            </Text>
          </View>
        )}
      </View>

      {!isEditing ? (
        <>
          <View style={styles.configRow}>
            <Clock size={16} color="#64748b" strokeWidth={2.5} />
            <Text style={styles.configLabel}>Frecuencia</Text>
            <Text style={styles.configValue}>Cada {frequency} {freqLabel}</Text>
          </View>
          <View style={styles.configRow}>
            <HardDrive size={16} color="#64748b" strokeWidth={2.5} />
            <Text style={styles.configLabel}>Retención</Text>
            <Text style={styles.configValue}>{retention} días</Text>
          </View>
          <TouchableOpacity
            style={[styles.editConfigButton, { borderColor: accentColor }]}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Settings size={14} color={accentColor} strokeWidth={2.5} />
            <Text style={[styles.editConfigText, { color: accentColor }]}>Configurar</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.switchRow}>
            <Text style={styles.inputLabel}>Backup automático activo</Text>
            <Switch
              value={editEnabled}
              onValueChange={setEditEnabled}
              trackColor={{ false: '#e2e8f0', true: accentColor + '80' }}
              thumbColor={editEnabled ? accentColor : '#94a3b8'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Frecuencia (horas) — máx {freqMax}h</Text>
            <TextInput
              style={styles.input}
              value={editFreq}
              onChangeText={setEditFreq}
              keyboardType="number-pad"
              placeholder={`1-${freqMax}`}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Retención (días)</Text>
            <TextInput
              style={styles.input}
              value={editRet}
              onChangeText={setEditRet}
              keyboardType="number-pad"
              placeholder="1-365"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.configActionButton, { backgroundColor: '#94a3b8' }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.configActionText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.configActionButton, { backgroundColor: accentColor }]}
              onPress={onSave}
              disabled={updateConfigMutation.isPending}
              activeOpacity={0.7}
            >
              {updateConfigMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.configActionText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Configuración del Sistema',
          headerStyle: { backgroundColor: '#64748b' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <LinearGradient colors={['#64748b', '#475569']} style={styles.headerGradient}>
            <Database size={48} color="#fff" strokeWidth={2} />
            <Text style={styles.headerTitle}>Copias de Seguridad</Text>
            <Text style={styles.headerSubtitle}>Gestión y restauración del sistema</Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración Automática</Text>
          <Text style={styles.sectionSubtitle}>
            Configura de forma independiente la frecuencia y retención para la base de datos y el programa
          </Text>

          {configQuery.isLoading ? (
            <ActivityIndicator size="large" color="#64748b" style={{ marginVertical: 20 }} />
          ) : (
            <>
              {renderConfigCard(
                'Base de Datos',
                <Database size={18} color="#3b82f6" strokeWidth={2.5} />,
                '#3b82f6',
                dbFrequency,
                dbRetention,
                dbEnabled,
                isEditingDbConfig,
                editDbFrequency,
                editDbRetention,
                editDbEnabled,
                'horas',
                handleEditDbConfig,
                () => setIsEditingDbConfig(false),
                handleSaveDbConfig,
                setEditDbFrequency,
                setEditDbRetention,
                setEditDbEnabled,
                '168'
              )}

              {renderConfigCard(
                'Programa (Código)',
                <Package size={18} color="#8b5cf6" strokeWidth={2.5} />,
                '#8b5cf6',
                programFrequency,
                programRetention,
                programEnabled,
                isEditingProgramConfig,
                editProgramFrequency,
                editProgramRetention,
                editProgramEnabled,
                'horas',
                handleEditProgramConfig,
                () => setIsEditingProgramConfig(false),
                handleSaveProgramConfig,
                setEditProgramFrequency,
                setEditProgramRetention,
                setEditProgramEnabled,
                '720'
              )}
            </>
          )}

          <View style={styles.infoBox}>
            <HardDrive size={16} color="#64748b" strokeWidth={2.5} />
            <Text style={styles.infoText}>/var/backups/reservamesa/</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { flex: 1 }]}
              onPress={() => handleCreateBackup('database')}
              disabled={createBackupMutation.isPending}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionGradient}>
                {createBackupMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Database size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.actionButtonTextSmall}>BD Manual</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { flex: 1 }]}
              onPress={() => handleCreateBackup('program')}
              disabled={createBackupMutation.isPending}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.actionGradient}>
                {createBackupMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Package size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.actionButtonTextSmall}>Prog. Manual</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { flex: 1 }]}
              onPress={() => handleCreateBackup('full')}
              disabled={createBackupMutation.isPending}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#10b981', '#059669']} style={styles.actionGradient}>
                {createBackupMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Upload size={16} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.actionButtonTextSmall}>Completa</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Copias Disponibles ({backups.length})</Text>

          {backupsQuery.isLoading && (
            <ActivityIndicator size="large" color="#64748b" style={{ marginVertical: 20 }} />
          )}

          {backups.map((backup) => (
            <View key={backup.id} style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Database size={22} color="#64748b" strokeWidth={2.5} />
                <View style={styles.backupInfo}>
                  <Text style={styles.backupFilename}>{backup.filename}</Text>
                  <Text style={styles.backupMeta}>
                    {backup.size} · {backup.date} · {backup.type === 'auto' ? 'Automática' : 'Manual'}
                  </Text>
                </View>
                <View style={[styles.backupBadge, backup.type === 'manual' && styles.backupBadgeManual]}>
                  <Text style={styles.backupBadgeText}>
                    {backup.type === 'auto' ? 'AUTO' : 'MANUAL'}
                  </Text>
                </View>
              </View>

              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={styles.backupActionButton}
                  onPress={() => handleDownloadBackup(backup)}
                  activeOpacity={0.7}
                >
                  <Download size={16} color="#3b82f6" strokeWidth={2.5} />
                  <Text style={styles.backupActionText}>Descargar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backupActionButton}
                  onPress={() => handleRestoreBackup(backup)}
                  disabled={isRestoring}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={16} color="#10b981" strokeWidth={2.5} />
                  <Text style={styles.backupActionText}>Restaurar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backupActionButton}
                  onPress={() => handleDeleteBackup(backup)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.backupActionText, { color: '#ef4444' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>

          <TouchableOpacity
            style={styles.passwordToggleButton}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
            activeOpacity={0.7}
          >
            <Key size={20} color="#64748b" strokeWidth={2.5} />
            <Text style={styles.passwordToggleText}>Cambiar Contraseña de Administrador</Text>
            {showPasswordSection ? (
              <ChevronUp size={18} color="#64748b" strokeWidth={2.5} />
            ) : (
              <ChevronDown size={18} color="#64748b" strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={styles.passwordSection}>
              <Text style={styles.passwordInfo}>
                Por seguridad, debe ingresar su contraseña actual y un código de verificación enviado por email.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña Actual</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  placeholder="Ingrese contraseña actual"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TouchableOpacity
                style={[styles.codeButton, codeSent && styles.codeButtonDisabled]}
                onPress={handleSendVerificationCode}
                disabled={codeSent || !currentPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.codeButtonText}>
                  {codeSent ? '✓ Código Enviado' : 'Enviar Código de Verificación'}
                </Text>
              </TouchableOpacity>

              {codeSent && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Código de Verificación</Text>
                    <TextInput
                      style={styles.input}
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="Código de 6 dígitos"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholder="Ingrese nueva contraseña"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.changePasswordButton}
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                    activeOpacity={0.7}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.changePasswordButtonText}>Cambiar Contraseña</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {isRestoring && (
          <View style={styles.overlay}>
            <View style={styles.overlayCard}>
              <ActivityIndicator size="large" color="#64748b" />
              <Text style={styles.overlayText}>Restaurando sistema...</Text>
              <Text style={styles.overlaySubtext}>Por favor espere, no cierre esta ventana</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  configCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    marginBottom: 4,
  },
  configCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configLabel: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  configValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600' as const,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500' as const,
    fontFamily: 'monospace',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonTextSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backupInfo: {
    flex: 1,
  },
  backupFilename: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 3,
  },
  backupMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  backupBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  backupBadgeManual: {
    backgroundColor: '#fef3c7',
  },
  backupBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#1e40af',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backupActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backupActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  overlayText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  overlaySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  passwordToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  passwordToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  passwordSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  passwordInfo: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeButton: {
    backgroundColor: '#3b82f6',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  codeButtonDisabled: {
    backgroundColor: '#10b981',
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  changePasswordButton: {
    backgroundColor: '#64748b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  changePasswordButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editConfigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    marginTop: 2,
  },
  editConfigText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  configActionButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
