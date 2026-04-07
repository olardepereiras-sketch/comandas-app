import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, ActivityIndicator, Modal, Pressable, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Edit2, Trash2, Clock, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestaurantId } from '@/lib/restaurantSession';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface TimeSlot {
  time: string;
  maxGuests: number;
}

interface WeeklySchedule {
  id: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  slots: TimeSlot[];
  minClientRating: number;
  selectedTemplateIds: string[];
}

interface ShiftTemplate {
  id: string;
  name: string;
  times: string[];
}

interface ShiftSlotConfig {
  time: string;
  maxGuests: number;
  minRating: number;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function RestaurantSchedulesScreen() {
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);
  const [expandedShiftGroups, setExpandedShiftGroups] = useState(true);
  
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTimes, setNewTemplateTimes] = useState<string[]>([]);
  const [showTimeSlotPickerModal, setShowTimeSlotPickerModal] = useState(false);
  
  const [showConfigureShiftModal, setShowConfigureShiftModal] = useState(false);
  const [selectedScheduleForTemplate, setSelectedScheduleForTemplate] = useState<string | null>(null);
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState<ShiftTemplate | null>(null);
  const [shiftSlotsConfig, setShiftSlotsConfig] = useState<ShiftSlotConfig[]>([]);

  useEffect(() => {
    const loadRestaurantId = async () => {
      const id = await getRestaurantId();
      if (id) {
        setRestaurantId(id);
      }
    };
    loadRestaurantId();
  }, []);

  const schedulesQuery = trpc.schedules.list.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );

  const templatesQuery = trpc.shiftTemplates.list.useQuery(
    { restaurantId },
    { enabled: !!restaurantId }
  );

  const timeSlotsQuery = trpc.timeSlots.list.useQuery();

  const createTemplateMutation = trpc.shiftTemplates.create.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setShowAddTemplateModal(false);
      setNewTemplateName('');
      setNewTemplateTimes([]);
      Alert.alert('Éxito', 'Plantilla de turno creada');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      Alert.alert('Error', 'No se pudo crear la plantilla');
    },
  });

  const updateTemplateMutation = trpc.shiftTemplates.update.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setShowEditTemplateModal(false);
      setEditingTemplate(null);
      Alert.alert('Éxito', 'Plantilla actualizada');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      Alert.alert('Error', 'No se pudo actualizar la plantilla');
    },
  });

  const deleteTemplateMutation = trpc.shiftTemplates.delete.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      Alert.alert('Éxito', 'Plantilla eliminada');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      Alert.alert('Error', 'No se pudo eliminar la plantilla');
    },
  });

  const updateScheduleMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      schedulesQuery.refetch();
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      Alert.alert('Error', 'No se pudo actualizar el horario');
    },
  });

  const syncToCalendarMutation = trpc.schedules.syncToCalendar.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        '✅ Calendario Actualizado',
        `Se han sincronizado ${data.updatedCount} días en el calendario de Reservas Pro.\n${data.skippedCount} días omitidos (cerrados o sin turnos).`
      );
    },
    onError: (error) => {
      console.error('Error syncing to calendar:', error);
      Alert.alert('Error', 'No se pudo actualizar el calendario. Inténtalo de nuevo.');
    },
  });

  const createScheduleMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      schedulesQuery.refetch();
    },
    onError: (error) => {
      console.error('Error creating schedule:', error);
      Alert.alert('Error', 'No se pudo crear el horario');
    },
  });

  useEffect(() => {
    if (templatesQuery.data) {
      setShiftTemplates(templatesQuery.data as ShiftTemplate[]);
    }
  }, [templatesQuery.data]);

  useEffect(() => {
    if (!schedulesQuery.isLoading && restaurantId) {
      const allDays: WeeklySchedule[] = [];
      
      for (let day = 0; day <= 6; day++) {
        const existingSchedule = schedulesQuery.data?.find(
          (s: any) => s.dayOfWeek === day
        );

        if (existingSchedule) {
          allDays.push({
            id: existingSchedule.id,
            dayOfWeek: existingSchedule.dayOfWeek as DayOfWeek,
            isOpen: existingSchedule.isOpen,
            slots: existingSchedule.shifts.flatMap((shift: any) => {
              const slots: TimeSlot[] = [];
              const [startHour, startMin] = shift.startTime.split(':').map(Number);
              const [endHour, endMin] = shift.endTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;
              
              for (let min = startMinutes; min < endMinutes; min += 30) {
                const hour = Math.floor(min / 60);
                const minute = min % 60;
                slots.push({
                  time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
                  maxGuests: shift.maxGuestsPerHour,
                });
              }
              return slots;
            }),
            minClientRating: Number(existingSchedule.shifts[0]?.minRating || 0),
            selectedTemplateIds: [],
          });
        } else {
          allDays.push({
            id: `temp-${day}`,
            dayOfWeek: day as DayOfWeek,
            isOpen: false,
            slots: [],
            minClientRating: 0,
            selectedTemplateIds: [],
          });
        }
      }
      
      setWeeklySchedules(allDays);
    }
  }, [schedulesQuery.data, schedulesQuery.isLoading, restaurantId]);

  const handleToggleDay = (dayOfWeek: DayOfWeek) => {
    setExpandedDay(expandedDay === dayOfWeek ? null : dayOfWeek);
  };

  const handleToggleDayOpen = (scheduleId: string) => {
    const schedule = weeklySchedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const newIsOpen = !schedule.isOpen;

    if (scheduleId.startsWith('temp-')) {
      createScheduleMutation.mutate({
        restaurantId,
        dayOfWeek: schedule.dayOfWeek,
        isOpen: newIsOpen,
        shifts: [],
      });
    } else {
      updateScheduleMutation.mutate({
        id: scheduleId,
        isOpen: newIsOpen,
      });
    }
  };

  const handleApplyTemplate = (scheduleId: string, templateId: string) => {
    const schedule = weeklySchedules.find(s => s.id === scheduleId);
    const template = shiftTemplates.find(t => t.id === templateId);
    
    if (!schedule || !template) return;

    const existingSchedule = schedulesQuery.data?.find((s: any) => s.id === scheduleId);
    if (existingSchedule?.shifts?.some((shift: any) => shift.templateId === templateId)) {
      Alert.alert('Plantilla ya aplicada', `La plantilla "${template.name}" ya está aplicada a este día. Elimínala primero si quieres volver a configurarla.`);
      return;
    }

    setSelectedScheduleForTemplate(scheduleId);
    setSelectedTemplateToApply(template);
    
    const initialConfig: ShiftSlotConfig[] = template.times.map(time => ({
      time,
      maxGuests: 30,
      minRating: 0.0,
    }));
    setShiftSlotsConfig(initialConfig);
    setShowConfigureShiftModal(true);
  };

  const handleConfirmApplyTemplate = () => {
    if (!selectedScheduleForTemplate || !selectedTemplateToApply) return;

    const schedule = weeklySchedules.find(s => s.id === selectedScheduleForTemplate);
    if (!schedule) return;

    const shifts = shiftSlotsConfig.map((slot) => ({
      templateId: selectedTemplateToApply.id,
      name: selectedTemplateToApply.name,
      startTime: slot.time,
      endTime: calculateEndTime(slot.time),
      maxGuestsPerHour: slot.maxGuests,
      minRating: slot.minRating,
    }));

    const templateName = selectedTemplateToApply.name;
    const dayName = DAY_NAMES[schedule.dayOfWeek];

    if (selectedScheduleForTemplate.startsWith('temp-')) {
      createScheduleMutation.mutate(
        {
          restaurantId,
          dayOfWeek: schedule.dayOfWeek,
          isOpen: true,
          shifts,
        },
        {
          onSuccess: () => {
            setShowConfigureShiftModal(false);
            setSelectedScheduleForTemplate(null);
            setSelectedTemplateToApply(null);
            Alert.alert('Éxito', `Turno "${templateName}" aplicado al ${dayName}`);
          },
          onError: (error) => {
            console.error('Error applying template:', error);
            Alert.alert('Error', 'No se pudo aplicar el turno');
          },
        }
      );
    } else {
      const existingSchedule = schedulesQuery.data?.find((s: any) => s.id === selectedScheduleForTemplate);
      const existingShifts = (existingSchedule?.shifts || []).map((s: any) => ({
        templateId: s.templateId,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        maxGuestsPerHour: s.maxGuestsPerHour,
        minRating: s.minRating,
      }));

      updateScheduleMutation.mutate(
        {
          id: selectedScheduleForTemplate,
          shifts: [...existingShifts, ...shifts],
        },
        {
          onSuccess: () => {
            setShowConfigureShiftModal(false);
            setSelectedScheduleForTemplate(null);
            setSelectedTemplateToApply(null);
            Alert.alert('Éxito', `Turno "${templateName}" aplicado al ${dayName}`);
          },
          onError: (error) => {
            console.error('Error applying template:', error);
            Alert.alert('Error', 'No se pudo aplicar el turno');
          },
        }
      );
    }
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 30;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleAddTimeToTemplate = (time: string) => {
    if (!newTemplateTimes.includes(time)) {
      setNewTemplateTimes([...newTemplateTimes, time].sort());
      setShowTimeSlotPickerModal(false);
    } else {
      Alert.alert('Error', 'Esta hora ya está añadida');
    }
  };

  const handleRemoveTimeFromTemplate = (time: string) => {
    setNewTemplateTimes(newTemplateTimes.filter(t => t !== time));
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName || newTemplateTimes.length === 0) {
      Alert.alert('Error', 'Completa el nombre y añade al menos un horario');
      return;
    }

    createTemplateMutation.mutate({
      restaurantId,
      name: newTemplateName,
      times: newTemplateTimes,
    });
  };

  const handleEditTemplate = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateTimes(template.times);
    setShowEditTemplateModal(true);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !newTemplateName || newTemplateTimes.length === 0) {
      Alert.alert('Error', 'Completa el nombre y añade al menos un horario');
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      name: newTemplateName,
      times: newTemplateTimes,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar esta plantilla de turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteTemplateMutation.mutate({ id: templateId }),
        },
      ]
    );
  };

  const handleRemoveTemplateFromDay = (scheduleId: string, templateId: string) => {
    const existingSchedule = schedulesQuery.data?.find((s: any) => s.id === scheduleId);
    if (!existingSchedule) return;

    const templateName = existingSchedule.shifts.find((s: any) => s.templateId === templateId)?.name || 'Plantilla';

    console.log('🔵 [REMOVE TEMPLATE] Iniciando eliminación:', {
      scheduleId,
      templateId,
      templateName,
      platform: Platform.OS
    });

    const executeRemove = () => {
      const remainingShifts = existingSchedule.shifts
        .filter((shift: any) => shift.templateId !== templateId)
        .map((shift: any) => ({
          templateId: shift.templateId,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          maxGuestsPerHour: shift.maxGuestsPerHour,
          minRating: shift.minRating,
          minLocalRating: shift.minLocalRating || 0,
        }));
      
      console.log('🔵 [REMOVE TEMPLATE] Ejecutando mutación:', {
        scheduleId,
        templateId,
        templateName,
        remainingShifts: remainingShifts.length
      });
      
      updateScheduleMutation.mutate(
        {
          id: scheduleId,
          shifts: remainingShifts,
        },
        {
          onSuccess: () => {
            Alert.alert('Éxito', 'Plantilla eliminada correctamente');
            schedulesQuery.refetch();
          },
          onError: (error) => {
            console.error('Error removing template:', error);
            Alert.alert('Error', 'No se pudo eliminar la plantilla');
          },
        }
      );
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `¿Eliminar la plantilla "${templateName}" de este día?`
      );
      if (confirmed) {
        executeRemove();
      }
    } else {
      Alert.alert(
        'Confirmar eliminación',
        `¿Eliminar la plantilla "${templateName}" de este día?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: executeRemove,
          },
        ]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Horarios',
          headerStyle: { backgroundColor: '#8b5cf6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <View style={styles.container}>
        {schedulesQuery.isLoading ? (
          <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
        ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Sistema de Turnos</Text>
            <Text style={styles.infoText}>
              📋 Paso 1: Crea plantillas de turnos (ej: &quot;Comidas&quot;, &quot;Cenas&quot;)
            </Text>
            <Text style={styles.infoText}>
              📅 Paso 2: Aplica las plantillas a los días que desees
            </Text>
            <Text style={styles.infoText}>
              👥 Define comensales máximos por cada plantilla
            </Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.shiftGroupsHeader}
              onPress={() => setExpandedShiftGroups(!expandedShiftGroups)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.sectionTitle}>Plantillas de Turnos</Text>
                <Text style={styles.sectionSubtitle}>
                  Define tus turnos: comidas, cenas, etc.
                </Text>
              </View>
              {expandedShiftGroups ? (
                <ChevronUp size={24} color="#64748b" strokeWidth={2.5} />
              ) : (
                <ChevronDown size={24} color="#64748b" strokeWidth={2.5} />
              )}
            </TouchableOpacity>

            {expandedShiftGroups && (
              <>
                {shiftTemplates.map((template) => (
                  <View key={template.id} style={styles.shiftGroupCard}>
                    <View style={styles.shiftGroupHeader}>
                      <Text style={styles.shiftGroupName}>{template.name}</Text>
                      <View style={styles.shiftGroupActions}>
                        <TouchableOpacity 
                          style={styles.shiftIconButton} 
                          onPress={() => handleEditTemplate(template)}
                          activeOpacity={0.7}
                        >
                          <Edit2 size={16} color="#3b82f6" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.shiftIconButton} 
                          onPress={() => handleDeleteTemplate(template.id)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.shiftGroupTimes}>
                      {template.times.map((time, index) => (
                        <View key={index} style={styles.shiftTimeBadge}>
                          <Clock size={14} color="#8b5cf6" strokeWidth={2.5} />
                          <Text style={styles.shiftTimeText}>{time}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.templateHint}>⚙️ Comensales y valoración se configuran al aplicar</Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={styles.addGroupButton} 
                  onPress={() => setShowAddTemplateModal(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.addGroupGradient}>
                    <Plus size={20} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.addGroupText}>Crear Plantilla de Turno</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderWithButton}>
              <View>
                <Text style={styles.sectionTitle}>Días de la Semana</Text>
              </View>
              <TouchableOpacity
                style={[styles.refreshButton, syncToCalendarMutation.isPending && styles.refreshButtonDisabled]}
                onPress={() => {
                  if (!restaurantId) return;
                  if (Platform.OS === 'web') {
                    const confirmed = window.confirm(
                      '¿Actualizar el calendario de Reservas Pro con los horarios configurados? Se actualizarán los próximos 90 días abiertos.'
                    );
                    if (confirmed) {
                      syncToCalendarMutation.mutate({ restaurantId, daysAhead: 90 });
                    }
                  } else {
                    Alert.alert(
                      'Actualizar Calendario',
                      '¿Actualizar el calendario de Reservas Pro con los horarios configurados? Se actualizarán los próximos 90 días abiertos.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Actualizar',
                          onPress: () => syncToCalendarMutation.mutate({ restaurantId, daysAhead: 90 }),
                        },
                      ]
                    );
                  }
                }}
                activeOpacity={0.7}
                disabled={syncToCalendarMutation.isPending}
              >
                {syncToCalendarMutation.isPending ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <RefreshCw size={20} color="#8b5cf6" strokeWidth={2.5} />
                )}
                <Text style={styles.refreshButtonText}>
                  {syncToCalendarMutation.isPending ? 'Actualizando...' : 'Actualizar Calendario'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.expandHint}>👆 Toca para expandir y aplicar turnos</Text>
            {weeklySchedules.map((schedule) => (
              <View key={schedule.id} style={styles.dayCard}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  onPress={() => handleToggleDay(schedule.dayOfWeek)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayName}>{DAY_NAMES[schedule.dayOfWeek]}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        schedule.isOpen ? styles.statusOpen : styles.statusClosed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          schedule.isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                        ]}
                      >
                        {schedule.isOpen ? 'Abierto' : 'Cerrado'}
                      </Text>
                    </View>
                  </View>
                  {expandedDay === schedule.dayOfWeek ? (
                    <ChevronUp size={24} color="#64748b" strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={24} color="#64748b" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {expandedDay === schedule.dayOfWeek && (
                  <View style={styles.dayContent}>
                    <View style={styles.dayToggleRow}>
                      <Text style={styles.dayToggleLabel}>Restaurante abierto</Text>
                      <Switch
                        value={schedule.isOpen}
                        onValueChange={() => handleToggleDayOpen(schedule.id)}
                        trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                        thumbColor="#fff"
                      />
                    </View>

                    {schedule.isOpen && (
                      <>
                        <Text style={styles.applySectionTitle}>Aplicar Plantilla de Turno</Text>
                        <View style={styles.templatesContainer}>
                          {shiftTemplates.map((template) => (
                            <TouchableOpacity
                              key={template.id}
                              style={styles.templateButton}
                              onPress={() => handleApplyTemplate(schedule.id, template.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.templateButtonText}>{template.name}</Text>
                              <Plus size={16} color="#8b5cf6" strokeWidth={2.5} />
                            </TouchableOpacity>
                          ))}
                        </View>

                        {schedule.slots.length > 0 && (() => {
                          const existingSchedule = schedulesQuery.data?.find((s: any) => s.id === schedule.id);
                          if (!existingSchedule?.shifts) return null;

                          const groupedByTemplate = existingSchedule.shifts.reduce((acc: any, shift: any) => {
                            const templateId = shift.templateId || 'custom';
                            if (!acc[templateId]) {
                              const template = shiftTemplates.find(t => t.id === templateId);
                              acc[templateId] = {
                                templateId,
                                name: template?.name || shift.name || 'Turno',
                                shifts: [],
                              };
                            }
                            acc[templateId].shifts.push(shift);
                            return acc;
                          }, {});

                          return (
                            <>
                              <Text style={styles.applySectionTitle}>Plantillas Aplicadas</Text>
                              {Object.values(groupedByTemplate).map((group: any) => (
                                <View key={group.templateId} style={styles.appliedTemplateCard}>
                                  <View style={styles.appliedTemplateHeader}>
                                    <Text style={styles.appliedTemplateName}>{group.name}</Text>
                                    <TouchableOpacity
                                      style={styles.removeTemplateButton}
                                      onPress={() => handleRemoveTemplateFromDay(schedule.id, group.templateId)}
                                      activeOpacity={0.7}
                                    >
                                      <Trash2 size={16} color="#ef4444" strokeWidth={2.5} />
                                      <Text style={styles.removeTemplateText}>Eliminar</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <View style={styles.appliedTemplateSlotsEditable}>
                                    {group.shifts.map((shift: any, index: number) => (
                                      <View key={index} style={styles.appliedSlotEditCard}>
                                        <View style={styles.appliedSlotEditHeader}>
                                          <Clock size={14} color="#8b5cf6" strokeWidth={2.5} />
                                          <Text style={styles.appliedSlotTime}>{shift.startTime}</Text>
                                        </View>
                                        <View style={styles.appliedSlotEditRow}>
                                          <Text style={styles.appliedSlotEditLabel}>Comensales:</Text>
                                          <TextInput
                                            style={styles.appliedSlotEditInput}
                                            value={String(shift.maxGuestsPerHour)}
                                            onChangeText={(text) => {
                                              const updatedShifts = existingSchedule.shifts.map((s: any) => 
                                                s.templateId === group.templateId && s.startTime === shift.startTime
                                                  ? { ...s, maxGuestsPerHour: parseInt(text) || 0 }
                                                  : s
                                              );
                                              updateScheduleMutation.mutate({
                                                id: schedule.id,
                                                shifts: updatedShifts,
                                              });
                                            }}
                                            keyboardType="number-pad"
                                            placeholder="30"
                                            placeholderTextColor="#94a3b8"
                                          />
                                        </View>
                                        <View style={styles.appliedSlotEditRow}>
                                          <Text style={styles.appliedSlotEditLabel}>Valoración Global:</Text>
                                          <TextInput
                                            style={styles.appliedSlotEditInput}
                                            defaultValue={String((shift.minRating || 0).toFixed(1))}
                                            onBlur={(e) => {
                                              const text = e.nativeEvent.text;
                                              const value = parseFloat(text || '0');
                                              const clamped = Math.min(5, Math.max(0, value));
                                              const rounded = Math.round(clamped * 10) / 10;
                                              
                                              const updatedShifts = existingSchedule.shifts.map((s: any) => 
                                                s.templateId === group.templateId && s.startTime === shift.startTime
                                                  ? { ...s, minRating: rounded }
                                                  : s
                                              );
                                              updateScheduleMutation.mutate({
                                                id: schedule.id,
                                                shifts: updatedShifts,
                                              });
                                            }}
                                            onFocus={(e) => {
                                              if (Platform.OS === 'web') {
                                                setTimeout(() => {
                                                  (e.target as HTMLInputElement).select();
                                                }, 0);
                                              }
                                            }}
                                            keyboardType="decimal-pad"
                                            placeholder="0.0"
                                            placeholderTextColor="#94a3b8"
                                          />
                                        </View>
                                        <View style={styles.appliedSlotEditRow}>
                                          <Text style={styles.appliedSlotEditLabel}>Valoración Local:</Text>
                                          <TextInput
                                            style={styles.appliedSlotEditInput}
                                            defaultValue={String((shift.minLocalRating || 0).toFixed(1))}
                                            onBlur={(e) => {
                                              const text = e.nativeEvent.text;
                                              const value = parseFloat(text || '0');
                                              const clamped = Math.min(5, Math.max(0, value));
                                              const rounded = Math.round(clamped * 10) / 10;
                                              
                                              const updatedShifts = existingSchedule.shifts.map((s: any) => 
                                                s.templateId === group.templateId && s.startTime === shift.startTime
                                                  ? { ...s, minLocalRating: rounded }
                                                  : s
                                              );
                                              updateScheduleMutation.mutate({
                                                id: schedule.id,
                                                shifts: updatedShifts,
                                              });
                                            }}
                                            onFocus={(e) => {
                                              if (Platform.OS === 'web') {
                                                setTimeout(() => {
                                                  (e.target as HTMLInputElement).select();
                                                }, 0);
                                              }
                                            }}
                                            keyboardType="decimal-pad"
                                            placeholder="0.0"
                                            placeholderTextColor="#94a3b8"
                                          />
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                </View>
                              ))}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
        )}

        <Modal
          visible={showAddTemplateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddTemplateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Crear Plantilla</Text>
                <TouchableOpacity
                  onPress={() => setShowAddTemplateModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Nombre de la Plantilla</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newTemplateName}
                  onChangeText={setNewTemplateName}
                  placeholder="Ej: Comidas, Cenas"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Añadir Horarios</Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => setShowTimeSlotPickerModal(true)}
                  activeOpacity={0.7}
                >
                  <Clock size={20} color="#8b5cf6" strokeWidth={2.5} />
                  <Text style={styles.timePickerButtonText}>Seleccionar Hora</Text>
                  <ChevronDown size={20} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>

                <View style={styles.timesGrid}>
                  {newTemplateTimes.map((time, index) => (
                    <View key={index} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{time}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTimeFromTemplate(time)}>
                        <X size={16} color="#7c3aed" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>


              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowAddTemplateModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleCreateTemplate}
                >
                  <Text style={styles.modalSaveText}>Crear</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showEditTemplateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEditTemplateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Plantilla</Text>
                <TouchableOpacity
                  onPress={() => setShowEditTemplateModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Nombre de la Plantilla</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newTemplateName}
                  onChangeText={setNewTemplateName}
                  placeholder="Ej: Comidas, Cenas"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Añadir Horarios</Text>
                <TouchableOpacity 
                  style={styles.timePickerButton}
                  onPress={() => setShowTimeSlotPickerModal(true)}
                  activeOpacity={0.7}
                >
                  <Clock size={20} color="#8b5cf6" strokeWidth={2.5} />
                  <Text style={styles.timePickerButtonText}>Seleccionar Hora</Text>
                  <ChevronDown size={20} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>

                <View style={styles.timesGrid}>
                  {newTemplateTimes.map((time, index) => (
                    <View key={index} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{time}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTimeFromTemplate(time)}>
                        <X size={16} color="#7c3aed" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>


              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowEditTemplateModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleUpdateTemplate}
                >
                  <Text style={styles.modalSaveText}>Actualizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showConfigureShiftModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfigureShiftModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Turno: {selectedTemplateToApply?.name}</Text>
                <TouchableOpacity
                  onPress={() => setShowConfigureShiftModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.configHint}>⚙️ Configura comensales y valoración para cada horario</Text>
                {shiftSlotsConfig.map((slot, index) => (
                  <View key={index} style={styles.slotConfigCard}>
                    <View style={styles.slotConfigHeader}>
                      <Clock size={18} color="#8b5cf6" strokeWidth={2.5} />
                      <Text style={styles.slotConfigTime}>{slot.time}</Text>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Comensales Máximos</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={String(slot.maxGuests)}
                      onChangeText={(text) => {
                        const newConfig = [...shiftSlotsConfig];
                        newConfig[index].maxGuests = parseInt(text) || 0;
                        setShiftSlotsConfig(newConfig);
                      }}
                      placeholder="30"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Valoración Mínima Global</Text>
                    <TextInput
                      style={styles.modalInput}
                      defaultValue={String(slot.minRating.toFixed(1))}
                      onBlur={(e) => {
                        const text = e.nativeEvent.text;
                        const value = parseFloat(text || '0');
                        const clamped = Math.min(5, Math.max(0, value));
                        const rounded = Math.round(clamped * 10) / 10;
                        
                        const newConfig = [...shiftSlotsConfig];
                        newConfig[index].minRating = rounded;
                        setShiftSlotsConfig(newConfig);
                      }}
                      onFocus={(e) => {
                        if (Platform.OS === 'web') {
                          setTimeout(() => {
                            (e.target as HTMLInputElement).select();
                          }, 0);
                        }
                      }}
                      placeholder="0.0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowConfigureShiftModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleConfirmApplyTemplate}
                >
                  <Text style={styles.modalSaveText}>Aplicar Turno</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTimeSlotPickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimeSlotPickerModal(false)}
        >
          <Pressable 
            style={styles.pickerModalOverlay} 
            onPress={() => setShowTimeSlotPickerModal(false)}
          >
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Seleccionar Hora</Text>
                <TouchableOpacity onPress={() => setShowTimeSlotPickerModal(false)}>
                  <X size={24} color="#64748b" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalList}>
                {timeSlotsQuery.isLoading ? (
                  <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />
                ) : timeSlotsQuery.data && timeSlotsQuery.data.length > 0 ? (
                  timeSlotsQuery.data.map((slot) => (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.pickerModalItem,
                        newTemplateTimes.includes(slot.time) && styles.pickerModalItemDisabled
                      ]}
                      onPress={() => handleAddTimeToTemplate(slot.time)}
                      disabled={newTemplateTimes.includes(slot.time)}
                      activeOpacity={0.7}
                    >
                      <Clock size={18} color={newTemplateTimes.includes(slot.time) ? "#cbd5e1" : "#8b5cf6"} strokeWidth={2.5} />
                      <Text style={[
                        styles.pickerModalItemText,
                        newTemplateTimes.includes(slot.time) && styles.pickerModalItemTextDisabled
                      ]}>
                        {slot.time}
                      </Text>
                      {newTemplateTimes.includes(slot.time) && (
                        <Text style={styles.pickerModalItemBadge}>Ya añadida</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyTimeSlotsContainer}>
                    <Clock size={48} color="#cbd5e1" strokeWidth={1.5} />
                    <Text style={styles.emptyTimeSlotsTitle}>No hay horas disponibles</Text>
                    <Text style={styles.emptyTimeSlotsText}>
                      El administrador debe crear horas disponibles en{' '}
                      <Text style={{ fontWeight: '600' as const }}>Admin → Ubicaciones y Horas</Text>
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#ede9fe',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#6d28d9',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#7c3aed',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  expandHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: '#dcfce7',
  },
  statusClosed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusTextOpen: {
    color: '#10b981',
  },
  statusTextClosed: {
    color: '#ef4444',
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  dayToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayToggleLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  applySectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 8,
  },
  templatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  templateButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  slotGuests: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotGuestsLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  shiftGroupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftGroupCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftGroupName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  shiftGroupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftGroupTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  shiftTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shiftTimeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  shiftGroupMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  shiftGroupRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftGroupRatingText: {
    fontSize: 13,
    color: '#64748b',
  },
  addGroupButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  addGroupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addGroupText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  timePickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500' as const,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  templateHint: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic' as const,
    marginTop: 8,
  },
  configHint: {
    fontSize: 13,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  slotConfigCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotConfigTime: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  pickerModalList: {
    padding: 16,
  },
  pickerModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerModalItemDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  pickerModalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
  },
  pickerModalItemTextDisabled: {
    color: '#94a3b8',
  },
  pickerModalItemBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyTimeSlotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTimeSlotsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTimeSlotsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  appliedTemplateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appliedTemplateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appliedTemplateName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  removeTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeTemplateText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  appliedTemplateSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appliedSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedSlotTime: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#7c3aed',
  },
  appliedSlotGuests: {
    fontSize: 12,
    color: '#64748b',
  },
  appliedTemplateSlotsEditable: {
    gap: 12,
  },
  appliedSlotEditCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appliedSlotEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  appliedSlotEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  appliedSlotEditLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
    flex: 1,
  },
  appliedSlotEditInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600' as const,
    minWidth: 60,
    textAlign: 'center',
  },
});
