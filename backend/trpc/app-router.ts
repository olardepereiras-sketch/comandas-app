import { createTRPCRouter } from "./create-context";
import { listRestaurantsProcedure } from "./routes/restaurants/list/route";
import { restaurantDetailsProcedure } from "./routes/restaurants/details/route";
import { createRestaurantProcedure } from "./routes/restaurants/create/route";
import { updateRestaurantProcedure } from "./routes/restaurants/update/route";
import { deleteRestaurantProcedure } from "./routes/restaurants/delete/route";
import { listRestaurantRatingsProcedure } from "./routes/restaurants/list-ratings/route";
import { listProvincesProcedure, listCitiesProcedure } from "./routes/locations/list/route";
import { createProvinceProcedure } from "./routes/locations/create-province/route";
import { updateProvinceProcedure } from "./routes/locations/update-province/route";
import { deleteProvinceProcedure } from "./routes/locations/delete-province/route";
import { createCityProcedure } from "./routes/locations/create-city/route";
import { updateCityProcedure } from "./routes/locations/update-city/route";
import { deleteCityProcedure } from "./routes/locations/delete-city/route";
import { listTableLocationsProcedure } from "./routes/locations/table-locations/route";
import { createTableLocationProcedure } from "./routes/tables/create-location/route";
import { updateTableLocationProcedure } from "./routes/tables/update-location/route";
import { deleteTableLocationProcedure } from "./routes/tables/delete-location/route";
import { listTablesProcedure } from "./routes/tables/list/route";
import { createTableProcedure } from "./routes/tables/create-table/route";
import { updateTableProcedure } from "./routes/tables/update-table/route";
import { deleteTableProcedure } from "./routes/tables/delete-table/route";
import { listSchedulesProcedure } from "./routes/schedules/list/route";
import { createScheduleProcedure } from "./routes/schedules/create/route";
import { updateScheduleProcedure } from "./routes/schedules/update/route";
import { deleteScheduleProcedure } from "./routes/schedules/delete/route";
import { syncSchedulesToCalendarProcedure } from "./routes/schedules/sync-to-calendar/route";
import { createReservationProcedure } from "./routes/reservations/create/route";
import { availableSlotsProcedure } from "./routes/reservations/available-slots/route";
import { listReservationsProcedure } from "./routes/reservations/list/route";
import { checkPhoneProcedure } from "./routes/clients/check-phone/route";
import { availableGuestCountsProcedure } from "./routes/clients/available-guest-counts/route";
import { listClientsProcedure } from "./routes/clients/list/route";
import { updateClientRatingProcedure } from "./routes/clients/update-rating/route";
import { deleteClientProcedure } from "./routes/clients/delete/route";
import { adminLoginProcedure } from "./routes/auth/admin-login/route";
import { restaurantLoginProcedure } from "./routes/auth/restaurant-login/route";
import { verifyCodeProcedure } from "./routes/auth/verify-code/route";
import { listSubscriptionPlansProcedure } from "./routes/subscription-plans/list/route";
import { listAllSubscriptionPlansProcedure } from "./routes/subscription-plans/list-all/route";
import { createSubscriptionPlanProcedure } from "./routes/subscription-plans/create/route";
import { updateSubscriptionPlanProcedure } from "./routes/subscription-plans/update/route";
import { deleteSubscriptionPlanProcedure } from "./routes/subscription-plans/delete/route";
import { setVisibilityProcedure } from "./routes/subscription-plans/set-visibility/route";
import { setPlanDurationsProcedure } from "./routes/subscription-plans/set-plan-durations/route";
import { listSubscriptionDurationsProcedure } from "./routes/subscription-durations/list/route";
import { listAllSubscriptionDurationsProcedure } from "./routes/subscription-durations/list-all/route";
import { createSubscriptionDurationProcedure } from "./routes/subscription-durations/create/route";
import { updateSubscriptionDurationProcedure } from "./routes/subscription-durations/update/route";
import { deleteSubscriptionDurationProcedure } from "./routes/subscription-durations/delete/route";
import { setDurationVisibilityProcedure } from "./routes/subscription-durations/set-visibility/route";
import { dashboardStatsProcedure } from "./routes/stats/dashboard/route";
import { restaurantDashboardStatsProcedure } from "./routes/stats/restaurant-dashboard/route";
import { toggleRestaurantActiveProcedure } from "./routes/restaurants/toggle-active/route";
import { listShiftTemplatesProcedure } from "./routes/shift-templates/list/route";
import { createShiftTemplateProcedure } from "./routes/shift-templates/create/route";
import { updateShiftTemplateProcedure } from "./routes/shift-templates/update/route";
import { deleteShiftTemplateProcedure } from "./routes/shift-templates/delete/route";
import { listDayExceptionsProcedure } from "./routes/day-exceptions/list/route";
import { createDayExceptionProcedure } from "./routes/day-exceptions/create/route";
import { updateDayExceptionProcedure } from "./routes/day-exceptions/update/route";
import { deleteDayExceptionProcedure } from "./routes/day-exceptions/delete/route";
import { updateDayExceptionWithShiftsProcedure } from "./routes/day-exceptions/update-with-shifts/route";
import { cancelReservationProcedure } from "./routes/reservations/cancel/route";
import { updateReservationTableProcedure } from "./routes/reservations/update-table/route";
import { swapTablesProcedure } from "./routes/reservations/swap-tables/route";
import { deleteReservationProcedure } from "./routes/reservations/delete/route";
import { recoverReservationProcedure } from "./routes/reservations/recover/route";
import { listCuisineTypesProcedure } from "./routes/cuisine-types/list/route";
import { createCuisineTypeProcedure } from "./routes/cuisine-types/create/route";
import { updateCuisineTypeProcedure } from "./routes/cuisine-types/update/route";
import { deleteCuisineTypeProcedure } from "./routes/cuisine-types/delete/route";
import { assignCuisineToProvinceProcedure } from "./routes/cuisine-types/assign-to-province/route";
import { cuisineTypesByProvinceProcedure } from "./routes/cuisine-types/by-province/route";
import { cuisineTypesDiagnosticsProcedure } from "./routes/cuisine-types/diagnostics/route";
import { mergeCuisineTypesProcedure } from "./routes/cuisine-types/merge/route";
import { listRatingCriteriaProcedure } from "./routes/rating-criteria/list/route";
import { createRatingCriteriaProcedure } from "./routes/rating-criteria/create/route";
import { updateRatingCriteriaProcedure } from "./routes/rating-criteria/update/route";
import { deleteRatingCriteriaProcedure } from "./routes/rating-criteria/delete/route";
import { listNoShowConfigProcedure } from "./routes/no-show-config/list/route";
import { updateNoShowConfigProcedure } from "./routes/no-show-config/update/route";
import { listNoShowRulesProcedure } from "./routes/no-show-rules/list/route";
import { createNoShowRuleProcedure } from "./routes/no-show-rules/create/route";
import { updateNoShowRuleProcedure } from "./routes/no-show-rules/update/route";
import { deleteNoShowRuleProcedure } from "./routes/no-show-rules/delete/route";
import { getClientNoShowsProcedure } from "./routes/clients/get-no-shows/route";
import { toggleNoShowProcedure } from "./routes/clients/toggle-no-show/route";
import { listClientRatingsProcedure } from "./routes/clients/list-ratings/route";
import { updateClientRatingDetailProcedure } from "./routes/clients/update-rating-detail/route";
import { deleteClientRatingProcedure } from "./routes/clients/delete-rating/route";
import { listModulesProcedure } from "./routes/modules/list/route";
import { createModuleProcedure } from "./routes/modules/create/route";
import { updateModuleProcedure } from "./routes/modules/update/route";
import { deleteModuleProcedure } from "./routes/modules/delete/route";
import { getReservationByTokenProcedure } from "./routes/reservations/get-by-token/route";
import { cancelReservationByClientProcedure } from "./routes/reservations/cancel-by-client/route";
import { modifyReservationByClientProcedure } from "./routes/reservations/modify-by-client/route";
import { rateClientProcedure } from "./routes/reservations/rate-client/route";
import { listTimeSlotsProcedure } from "./routes/time-slots/list/route";
import { createTimeSlotProcedure } from "./routes/time-slots/create/route";
import { deleteTimeSlotProcedure } from "./routes/time-slots/delete/route";
import { availableTablesForReservationProcedure } from "./routes/tables/available-for-reservation/route";
import { createTableGroupProcedure } from "./routes/tables/create-group/route";
import { updateTableGroupProcedure } from "./routes/tables/update-group/route";
import { deleteTableGroupProcedure } from "./routes/tables/delete-group/route";
import { listTableGroupsProcedure } from "./routes/tables/list-groups/route";
import { updateHighChairsProcedure } from "./routes/restaurants/update-high-chairs/route";
import { loadDurationProcedure } from "./routes/restaurants/load-duration/route";
import { confirmPendingReservationProcedure } from "./routes/reservations/confirm-pending/route";
import { getReservationByToken2Procedure } from "./routes/reservations/get-by-token2/route";
import { confirmPendingReservation2Procedure } from "./routes/reservations/confirm-pending2/route";
import { getWhatsAppQrProcedure } from "./routes/whatsapp/get-qr/route";
import { disconnectWhatsAppProcedure } from "./routes/whatsapp/disconnect/route";
import { adminGetWhatsAppQrProcedure } from "./routes/whatsapp/admin-get-qr/route";
import { adminDisconnectWhatsAppProcedure } from "./routes/whatsapp/admin-disconnect/route";
import { adminSendWhatsAppProcedure } from "./routes/whatsapp/admin-send-message/route";
import { wakeUpWhatsAppProcedure } from "./routes/whatsapp/wake-up/route";
import { searchReservationsByPhoneProcedure } from "./routes/reservations/search-by-phone/route";
import { validateMaxCapacityProcedure } from "./routes/reservations/validate-max-capacity/route";
import { expandSlotCapacityProcedure } from "./routes/reservations/expand-slot-capacity/route";
import { listSalesRepsProcedure } from "./routes/sales-reps/list/route";
import { createSalesRepProcedure } from "./routes/sales-reps/create/route";
import { updateSalesRepProcedure } from "./routes/sales-reps/update/route";
import { deleteSalesRepProcedure } from "./routes/sales-reps/delete/route";
import { setVipProcedure } from "./routes/clients/set-vip/route";
import { getVipInfoProcedure } from "./routes/clients/get-vip-info/route";
import { toggleUnwantedProcedure } from "./routes/clients/toggle-unwanted/route";
import { listBlockedClientsProcedure } from "./routes/clients/list-blocked/route";
import { getClientDetailsProcedure } from "./routes/clients/get-client-details/route";
import { salesRepCommissionsProcedure } from "./routes/stats/commissions/route";
import { newRestaurantsProcedure } from "./routes/stats/new-restaurants/route";
import { renewalsProcedure } from "./routes/stats/renewals/route";
import { blockTableRoute } from "./routes/tables/block-table/route";
import { listBlocksRoute } from "./routes/tables/list-blocks/route";
import { unblockTableRoute } from "./routes/tables/unblock-table/route";
import { createTemporaryTableGroupProcedure } from "./routes/tables/create-temporary-group/route";
import { createSplitTableProcedure } from "./routes/tables/create-split-table/route";
import { splitTableDirectProcedure } from "./routes/tables/split-table-direct/route";
import { groupTablesDirectProcedure } from "./routes/tables/group-tables-direct/route";
import { createReservationWithTableSplitProcedure } from "./routes/reservations/create-with-table-split/route";
import { cleanupTemporaryTablesProcedure } from "./routes/reservations/cleanup-temporary-tables/route";
import { updateReservationProcedure } from "./routes/reservations/update/route";
import { updateReservationInternalNotesProcedure } from "./routes/reservations/update-internal-notes/route";
import { checkClientOverlapsProcedure } from "./routes/reservations/check-client-overlaps/route";
import { sendModificationNotificationProcedure } from "./routes/reservations/send-modification-notification/route";
import { listTablesWithTemporaryProcedure } from "./routes/tables/list-with-temporary/route";
import { listTablesForPlanningProcedure } from "./routes/tables/list-for-planning/route";
import { undoGroupProcedure } from "./routes/tables/undo-group/route";
import { undoSplitProcedure } from "./routes/tables/undo-split/route";
import { updateDepositsConfigProcedure } from "./routes/deposits/update-config/route";
import { getDepositsConfigProcedure } from "./routes/deposits/get-config/route";
import { createDepositCheckoutProcedure } from "./routes/deposits/create-checkout/route";
import { checkDepositRequiredProcedure } from "./routes/deposits/check-deposit/route";
import { confirmDepositPaymentProcedure } from "./routes/deposits/confirm-deposit/route";
import { listDepositOperationsProcedure } from "./routes/deposits/list-operations/route";
import { refundDepositOperationProcedure } from "./routes/deposits/refund-operation/route";
import { createCheckoutSessionProcedure } from "./routes/subscriptions/create-checkout/route";
import { confirmPaymentProcedure } from "./routes/subscriptions/confirm-payment/route";
import { checkOrderProcedure } from "./routes/subscriptions/check-order/route";
import { getExpiryConfigProcedure, updateExpiryConfigProcedure } from "./routes/stats/expiry-config/route";
import { getAdminStripeConfigProcedure } from "./routes/stats/stripe-config/get";
import { updateAdminStripeConfigProcedure } from "./routes/stats/stripe-config/update";
import { getStoreVatConfigProcedure, updateStoreVatConfigProcedure } from "./routes/stats/vat-config/route";
import { listBackupsProcedure } from "./routes/backups/list/route";
import { createBackupProcedure } from "./routes/backups/create/route";
import { downloadBackupProcedure } from "./routes/backups/download/route";
import { restoreBackupProcedure } from "./routes/backups/restore/route";
import { deleteBackupProcedure } from "./routes/backups/delete/route";
import { getBackupConfigProcedure, updateBackupConfigProcedure } from "./routes/backups/config/route";
import { listSubAdminsProcedure } from "./routes/sub-admins/list/route";
import { createSubAdminProcedure } from "./routes/sub-admins/create/route";
import { updateSubAdminProcedure } from "./routes/sub-admins/update/route";
import { deleteSubAdminProcedure } from "./routes/sub-admins/delete/route";
import { subAdminLoginProcedure } from "./routes/sub-admins/login/route";
import { listAdminAuditProcedure } from "./routes/admin-audit/list/route";
import { logAdminActionProcedure } from "./routes/admin-audit/log-action/route";
import { generateSupportTokenProcedure } from "./routes/restaurants/generate-support-token/route";
import { validateSupportTokenProcedure } from "./routes/restaurants/validate-support-token/route";
import { validateAdminSessionProcedure } from "./routes/auth/validate-admin-session/route";
import { listDigitalMenusProcedure } from "./routes/digital-menus/list/route";
import { createDigitalMenuProcedure } from "./routes/digital-menus/create/route";
import { updateDigitalMenuProcedure } from "./routes/digital-menus/update/route";
import { deleteDigitalMenuProcedure } from "./routes/digital-menus/delete/route";
import { getPublicDigitalMenuProcedure } from "./routes/digital-menus/get-public/route";
import { listMenuCategoriesProcedure } from "./routes/menu-categories/list/route";
import { createMenuCategoryProcedure } from "./routes/menu-categories/create/route";
import { updateMenuCategoryProcedure } from "./routes/menu-categories/update/route";
import { deleteMenuCategoryProcedure } from "./routes/menu-categories/delete/route";
import { listMenuItemsProcedure } from "./routes/menu-items/list/route";
import { createMenuItemProcedure } from "./routes/menu-items/create/route";
import { updateMenuItemProcedure } from "./routes/menu-items/update/route";
import { deleteMenuItemProcedure } from "./routes/menu-items/delete/route";
import { getGameRankingProcedure } from "./routes/game/get-ranking/route";
import { submitGameScoreProcedure } from "./routes/game/submit-score/route";
import { getGameConfigProcedure } from "./routes/game/get-config/route";
import { updateGameConfigProcedure } from "./routes/game/update-config/route";
import { getGameConfigBySlugProcedure } from "./routes/game/get-config-by-slug/route";
import { getGameNotificationsProcedure } from "./routes/game/get-notifications/route";
import { dismissGameNotificationProcedure } from "./routes/game/dismiss-notification/route";
import { generateComandasTokenProcedure } from "./routes/comandas/generate-token/route";
import { validateComandasTokenProcedure } from "./routes/comandas/validate-token/route";
import { saveComandasDataProcedure } from "./routes/comandas/save-data/route";
import { loadComandasDataProcedure } from "./routes/comandas/load-data/route";
import { printKitchenTicketProcedure } from "./routes/comandas/print/route";
import { getAgentStatusProcedure } from "./routes/comandas/agent-status/route";
import { forceResetWhatsAppProcedure } from "./routes/whatsapp/force-reset/route";
import { listWhatsAppNotificationsProcedure } from "./routes/whatsapp/list-notifications/route";
import { deleteWhatsAppNotificationProcedure } from "./routes/whatsapp/delete-notification/route";
import { sendWhatsAppNotificationProcedure } from "./routes/whatsapp/send-notification/route";
import { getWhatsappProAdminConfigProcedure } from "./routes/whatsapp-pro/get-admin-config/route";
import { updateWhatsappProAdminConfigProcedure } from "./routes/whatsapp-pro/update-admin-config/route";
import { listWhatsappCreditPlansProcedure } from "./routes/whatsapp-pro/list-credit-plans/route";
import { createWhatsappCreditPlanProcedure } from "./routes/whatsapp-pro/create-credit-plan/route";
import { updateWhatsappCreditPlanProcedure } from "./routes/whatsapp-pro/update-credit-plan/route";
import { deleteWhatsappCreditPlanProcedure } from "./routes/whatsapp-pro/delete-credit-plan/route";
import { rechargeWhatsappCreditsProcedure } from "./routes/whatsapp-pro/recharge-credits/route";
import { listRestaurantWhatsappCreditsProcedure } from "./routes/whatsapp-pro/list-restaurant-credits/route";
import { updateRestaurantWhatsappConfigProcedure } from "./routes/whatsapp-pro/update-restaurant-whatsapp/route";
import { listChatbotConversationsProcedure } from "./routes/chatbot/list-conversations/route";
import { getChatbotConversationProcedure } from "./routes/chatbot/get-conversation/route";
import { replyChatbotConversationProcedure } from "./routes/chatbot/reply/route";
import { markChatbotConversationResolvedProcedure } from "./routes/chatbot/mark-resolved/route";
import { getChatbotSettingsProcedure } from "./routes/chatbot/get-settings/route";
import { updateChatbotSettingsProcedure } from "./routes/chatbot/update-settings/route";
import { createWaitlistEntryProcedure } from "./routes/waitlist/create/route";
import { listWaitlistProcedure } from "./routes/waitlist/list/route";
import { cancelWaitlistEntryProcedure } from "./routes/waitlist/cancel/route";
import { checkWaitlistProcedure } from "./routes/waitlist/check/route";
import { getWaitlistByTokenProcedure } from "./routes/waitlist/get-by-token/route";
import { confirmWaitlistEntryProcedure } from "./routes/waitlist/confirm-entry/route";
import { updateWaitlistTimeProcedure } from "./routes/waitlist/update-time/route";


export const appRouter = createTRPCRouter({
  restaurants: createTRPCRouter({
    list: listRestaurantsProcedure,
    details: restaurantDetailsProcedure,
    create: createRestaurantProcedure,
    update: updateRestaurantProcedure,
    delete: deleteRestaurantProcedure,
    toggleActive: toggleRestaurantActiveProcedure,
    updateHighChairs: updateHighChairsProcedure,
    loadDuration: loadDurationProcedure,
    listRatings: listRestaurantRatingsProcedure,
    generateSupportToken: generateSupportTokenProcedure,
    validateSupportToken: validateSupportTokenProcedure,
  }),
  locations: createTRPCRouter({
    provinces: listProvincesProcedure,
    createProvince: createProvinceProcedure,
    updateProvince: updateProvinceProcedure,
    deleteProvince: deleteProvinceProcedure,
    cities: listCitiesProcedure,
    createCity: createCityProcedure,
    updateCity: updateCityProcedure,
    deleteCity: deleteCityProcedure,
    list: listTableLocationsProcedure,
  }),
  tables: createTRPCRouter({
    list: listTablesProcedure,
    createTable: createTableProcedure,
    updateTable: updateTableProcedure,
    deleteTable: deleteTableProcedure,
    createLocation: createTableLocationProcedure,
    updateLocation: updateTableLocationProcedure,
    deleteLocation: deleteTableLocationProcedure,
    availableForReservation: availableTablesForReservationProcedure,
    createGroup: createTableGroupProcedure,
    updateGroup: updateTableGroupProcedure,
    deleteGroup: deleteTableGroupProcedure,
    listGroups: listTableGroupsProcedure,
    blockTable: blockTableRoute,
    listBlocks: listBlocksRoute,
    unblockTable: unblockTableRoute,
    createTemporaryGroup: createTemporaryTableGroupProcedure,
    createSplitTable: createSplitTableProcedure,
    splitTableDirect: splitTableDirectProcedure,
    groupTablesDirect: groupTablesDirectProcedure,
    listWithTemporary: listTablesWithTemporaryProcedure,
    listForPlanning: listTablesForPlanningProcedure,
    undoGroup: undoGroupProcedure,
    undoSplit: undoSplitProcedure,
  }),
  schedules: createTRPCRouter({
    list: listSchedulesProcedure,
    create: createScheduleProcedure,
    update: updateScheduleProcedure,
    delete: deleteScheduleProcedure,
    syncToCalendar: syncSchedulesToCalendarProcedure,
  }),
  reservations: createTRPCRouter({
    create: createReservationProcedure,
    availableSlots: availableSlotsProcedure,
    list: listReservationsProcedure,
    cancel: cancelReservationProcedure,
    updateTable: updateReservationTableProcedure,
    swapTables: swapTablesProcedure,
    delete: deleteReservationProcedure,
    recover: recoverReservationProcedure,
    getByToken: getReservationByTokenProcedure,
    getByToken2: getReservationByToken2Procedure,
    cancelByClient: cancelReservationByClientProcedure,
    modifyByClient: modifyReservationByClientProcedure,
    rateClient: rateClientProcedure,
    confirmPending: confirmPendingReservationProcedure,
    confirmPending2: confirmPendingReservation2Procedure,
    searchByPhone: searchReservationsByPhoneProcedure,
    validateMaxCapacity: validateMaxCapacityProcedure,
    expandSlotCapacity: expandSlotCapacityProcedure,
    createWithTableSplit: createReservationWithTableSplitProcedure,
    cleanupTemporaryTables: cleanupTemporaryTablesProcedure,
    update: updateReservationProcedure,
    updateInternalNotes: updateReservationInternalNotesProcedure,
    sendModificationNotification: sendModificationNotificationProcedure,
    checkClientOverlaps: checkClientOverlapsProcedure,
  }),
  clients: createTRPCRouter({
    checkPhone: checkPhoneProcedure,
    availableGuestCounts: availableGuestCountsProcedure,
    list: listClientsProcedure,
    updateRating: updateClientRatingProcedure,
    delete: deleteClientProcedure,
    getNoShows: getClientNoShowsProcedure,
    toggleNoShow: toggleNoShowProcedure,
    listRatings: listClientRatingsProcedure,
    updateRatingDetail: updateClientRatingDetailProcedure,
    deleteRating: deleteClientRatingProcedure,
    setVip: setVipProcedure,
    getVipInfo: getVipInfoProcedure,
    toggleUnwanted: toggleUnwantedProcedure,
    getClientDetails: getClientDetailsProcedure,
    listBlocked: listBlockedClientsProcedure,
  }),
  auth: createTRPCRouter({
    adminLogin: adminLoginProcedure,
    restaurantLogin: restaurantLoginProcedure,
    verifyCode: verifyCodeProcedure,
    validateAdminSession: validateAdminSessionProcedure,
    subAdminLogin: subAdminLoginProcedure,
  }),
  subAdmins: createTRPCRouter({
    list: listSubAdminsProcedure,
    create: createSubAdminProcedure,
    update: updateSubAdminProcedure,
    delete: deleteSubAdminProcedure,
  }),
  adminAudit: createTRPCRouter({
    list: listAdminAuditProcedure,
    logAction: logAdminActionProcedure,
  }),
  subscriptionPlans: createTRPCRouter({
    list: listSubscriptionPlansProcedure,
    listAll: listAllSubscriptionPlansProcedure,
    create: createSubscriptionPlanProcedure,
    update: updateSubscriptionPlanProcedure,
    delete: deleteSubscriptionPlanProcedure,
    setVisibility: setVisibilityProcedure,
    setPlanDurations: setPlanDurationsProcedure,
  }),
  subscriptionDurations: createTRPCRouter({
    list: listSubscriptionDurationsProcedure,
    listAll: listAllSubscriptionDurationsProcedure,
    create: createSubscriptionDurationProcedure,
    update: updateSubscriptionDurationProcedure,
    delete: deleteSubscriptionDurationProcedure,
    setVisibility: setDurationVisibilityProcedure,
  }),
  stats: createTRPCRouter({
    dashboard: dashboardStatsProcedure,
    restaurantDashboard: restaurantDashboardStatsProcedure,
    salesRepCommissions: salesRepCommissionsProcedure,
    newRestaurants: newRestaurantsProcedure,
    renewals: renewalsProcedure,
    getExpiryConfig: getExpiryConfigProcedure,
    updateExpiryConfig: updateExpiryConfigProcedure,
    getAdminStripeConfig: getAdminStripeConfigProcedure,
    updateAdminStripeConfig: updateAdminStripeConfigProcedure,
    getStoreVatConfig: getStoreVatConfigProcedure,
    updateStoreVatConfig: updateStoreVatConfigProcedure,
  }),
  shiftTemplates: createTRPCRouter({
    list: listShiftTemplatesProcedure,
    create: createShiftTemplateProcedure,
    update: updateShiftTemplateProcedure,
    delete: deleteShiftTemplateProcedure,
  }),
  dayExceptions: createTRPCRouter({
    list: listDayExceptionsProcedure,
    create: createDayExceptionProcedure,
    update: updateDayExceptionProcedure,
    updateWithShifts: updateDayExceptionWithShiftsProcedure,
    delete: deleteDayExceptionProcedure,
  }),
  cuisineTypes: createTRPCRouter({
    list: listCuisineTypesProcedure,
    create: createCuisineTypeProcedure,
    update: updateCuisineTypeProcedure,
    delete: deleteCuisineTypeProcedure,
    assignToProvince: assignCuisineToProvinceProcedure,
    byProvince: cuisineTypesByProvinceProcedure,
    diagnostics: cuisineTypesDiagnosticsProcedure,
    merge: mergeCuisineTypesProcedure,
  }),
  ratingCriteria: createTRPCRouter({
    list: listRatingCriteriaProcedure,
    create: createRatingCriteriaProcedure,
    update: updateRatingCriteriaProcedure,
    delete: deleteRatingCriteriaProcedure,
  }),
  noShowConfig: createTRPCRouter({
    list: listNoShowConfigProcedure,
    update: updateNoShowConfigProcedure,
  }),
  noShowRules: createTRPCRouter({
    list: listNoShowRulesProcedure,
    create: createNoShowRuleProcedure,
    update: updateNoShowRuleProcedure,
    delete: deleteNoShowRuleProcedure,
  }),
  modules: createTRPCRouter({
    list: listModulesProcedure,
    create: createModuleProcedure,
    update: updateModuleProcedure,
    delete: deleteModuleProcedure,
  }),
  timeSlots: createTRPCRouter({
    list: listTimeSlotsProcedure,
    create: createTimeSlotProcedure,
    delete: deleteTimeSlotProcedure,
  }),
  whatsapp: createTRPCRouter({
    getQr: getWhatsAppQrProcedure,
    disconnect: disconnectWhatsAppProcedure,
    forceReset: forceResetWhatsAppProcedure,
    adminGetQr: adminGetWhatsAppQrProcedure,
    adminDisconnect: adminDisconnectWhatsAppProcedure,
    adminSendMessage: adminSendWhatsAppProcedure,
    wakeUp: wakeUpWhatsAppProcedure,
    listNotifications: listWhatsAppNotificationsProcedure,
    deleteNotification: deleteWhatsAppNotificationProcedure,
    sendNotification: sendWhatsAppNotificationProcedure,
  }),
  salesReps: createTRPCRouter({
    list: listSalesRepsProcedure,
    create: createSalesRepProcedure,
    update: updateSalesRepProcedure,
    delete: deleteSalesRepProcedure,
  }),
  deposits: createTRPCRouter({
    getConfig: getDepositsConfigProcedure,
    updateConfig: updateDepositsConfigProcedure,
    createCheckout: createDepositCheckoutProcedure,
    checkRequired: checkDepositRequiredProcedure,
    confirmPayment: confirmDepositPaymentProcedure,
    listOperations: listDepositOperationsProcedure,
    refundOperation: refundDepositOperationProcedure,
  }),
  subscriptions: createTRPCRouter({
    createCheckoutSession: createCheckoutSessionProcedure,
    confirmPayment: confirmPaymentProcedure,
    checkOrder: checkOrderProcedure,
  }),
  backups: createTRPCRouter({
    list: listBackupsProcedure,
    create: createBackupProcedure,
    download: downloadBackupProcedure,
    restore: restoreBackupProcedure,
    delete: deleteBackupProcedure,
    getConfig: getBackupConfigProcedure,
    updateConfig: updateBackupConfigProcedure,
  }),
  digitalMenus: createTRPCRouter({
    list: listDigitalMenusProcedure,
    create: createDigitalMenuProcedure,
    update: updateDigitalMenuProcedure,
    delete: deleteDigitalMenuProcedure,
    getPublic: getPublicDigitalMenuProcedure,
  }),
  menuCategories: createTRPCRouter({
    list: listMenuCategoriesProcedure,
    create: createMenuCategoryProcedure,
    update: updateMenuCategoryProcedure,
    delete: deleteMenuCategoryProcedure,
  }),
  menuItems: createTRPCRouter({
    list: listMenuItemsProcedure,
    create: createMenuItemProcedure,
    update: updateMenuItemProcedure,
    delete: deleteMenuItemProcedure,
  }),
  game: createTRPCRouter({
    getRanking: getGameRankingProcedure,
    submitScore: submitGameScoreProcedure,
    getConfig: getGameConfigProcedure,
    updateConfig: updateGameConfigProcedure,
    getConfigBySlug: getGameConfigBySlugProcedure,
    getNotifications: getGameNotificationsProcedure,
    dismissNotification: dismissGameNotificationProcedure,
  }),
  comandas: createTRPCRouter({
    generateToken: generateComandasTokenProcedure,
    validateToken: validateComandasTokenProcedure,
    saveData: saveComandasDataProcedure,
    loadData: loadComandasDataProcedure,
    printKitchenTicket: printKitchenTicketProcedure,
    agentStatus: getAgentStatusProcedure,
  }),
  whatsappPro: createTRPCRouter({
    getAdminConfig: getWhatsappProAdminConfigProcedure,
    updateAdminConfig: updateWhatsappProAdminConfigProcedure,
    listCreditPlans: listWhatsappCreditPlansProcedure,
    createCreditPlan: createWhatsappCreditPlanProcedure,
    updateCreditPlan: updateWhatsappCreditPlanProcedure,
    deleteCreditPlan: deleteWhatsappCreditPlanProcedure,
    rechargeCredits: rechargeWhatsappCreditsProcedure,
    listRestaurantCredits: listRestaurantWhatsappCreditsProcedure,
    updateRestaurantWhatsapp: updateRestaurantWhatsappConfigProcedure,
  }),
  chatbot: createTRPCRouter({
    listConversations: listChatbotConversationsProcedure,
    getConversation: getChatbotConversationProcedure,
    reply: replyChatbotConversationProcedure,
    markResolved: markChatbotConversationResolvedProcedure,
    getSettings: getChatbotSettingsProcedure,
    updateSettings: updateChatbotSettingsProcedure,
  }),
  waitlist: createTRPCRouter({
    create: createWaitlistEntryProcedure,
    list: listWaitlistProcedure,
    cancel: cancelWaitlistEntryProcedure,
    check: checkWaitlistProcedure,
    getByToken: getWaitlistByTokenProcedure,
    confirmEntry: confirmWaitlistEntryProcedure,
    updateTime: updateWaitlistTimeProcedure,
  }),
});

export type AppRouter = typeof appRouter;
