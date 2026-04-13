const fs = require('fs');
const src = fs.readFileSync('src/templates/emailTemplate.js','utf8');
const lines = src.split('\n');
const results = [];
const missing = ['welcomeEmailTemplate','passwordExpiryReminderTemplate','accountDeactivationWarningTemplate','accountReactivatedTemplate','ORDER_RETURNED','SERVER_RESTARTED','SERVER_OVERLOADED','CONFIGURATION_CHANGED','PRODUCT_FEATURED','PRODUCT_REVIEWED','PRODUCT_ARCHIVED','MESSAGE_SENT','MESSAGE_READ','COMMENT_REPLIED','EMAIL_DELIVERED','EMAIL_FAILED','PUSH_NOTIFICATION_SENT','CHAT_ENDED','MONTHLY_REPORT_READY','TRAFFIC_SPIKE','CONVERSION_RATE_DROP','ENGAGEMENT_INCREASED','reviewRequestTemplate','dataExportRequestTemplate','policyUpdateTemplate','paymentRefundedTemplate','newDeviceApprovalTemplate','emailChangedTemplate','loginAlertTemplate','sessionExpiredTemplate','accountRecoveryTemplate','accountReactivationTemplate','accountSuspendedTemplate','consentRequiredTemplate','securitySettingsUpdatedTemplate','failedLoginAttemptsTemplate','accountVerifiedTemplate','trustedDeviceAddedTemplate','phoneVerificationTemplate','emailPhoneVerificationReminderTemplate','phoneNumberChangeRequestTemplate','phoneNumberChangeConfirmationTemplate','dataExportReadyTemplate','privacyPolicyUpdateTemplate','termsOfServiceUpdateTemplate','loginAttemptLimitExceededTemplate','twoFactorEnabledDisabledNotificationTemplate','accountVerificationReminderTemplate','accountSecurityAuditCompletedTemplate','backupEmailAddedRemovedTemplate','trustedDeviceManagementUpdateTemplate','multiFactorAuthenticationSetupReminderTemplate','secondaryPhoneVerificationTemplate','identityVerificationRequestTemplate','identityVerificationResultTemplate','accountAccessRevokedTemplate','passwordStrengthWarningTemplate','accountMergeConfirmationTemplate','socialLoginConnectionTemplate','wishlistReminderTemplate','wishlistBackInStockTemplate','wishlistPriceDropAlertTemplate','savedForLaterReminderTemplate','cartItemPriceChangedTemplate','wishlistItemDiscontinuedTemplate','cartExpiryNotificationTemplate','orderProcessingTemplate','orderPackedTemplate','orderOutForDeliveryTemplate','partialOrderShippedTemplate','orderSplitShipmentTemplate','deliveryDelayedNotificationTemplate','orderCanceledByCustomerTemplate','orderCanceledByStoreTemplate','preOrderConfirmationTemplate','preOrderShippedTemplate','digitalDownloadReadyTemplate','customOrderConfirmedTemplate','orderModificationRequestReceivedTemplate','orderModificationResultTemplate','returnRequestReceivedTemplate','returnApprovedTemplate','returnRejectedTemplate','refundProcessedTemplate','exchangeApprovedTemplate','exchangeRejectedTemplate','returnShipmentReceivedTemplate','partialRefundProcessedTemplate','paymentSuccessfulTemplate','paymentMethodExpiringSoonTemplate','subscriptionStartedTemplate','subscriptionRenewedSuccessfullyTemplate','subscriptionFailedRetryNeededTemplate','subscriptionCanceledTemplate','creditNoteIssuedTemplate','giftCardPurchasedTemplate','giftCardRedeemedTemplate','storeCreditAddedTemplate','storeCreditUsedTemplate','emiPaymentReminderTemplate','paymentDisputeNotificationTemplate','paymentDisputeResolvedTemplate','paymentMethodUpdatedTemplate','subscriptionPauseConfirmationTemplate','onboardingSeriesTemplate','customerMilestoneTemplate','loyaltyPointsRedeemedTemplate','loyaltyPointsExpiryReminderTemplate','referralInvitationTemplate','referralBonusEarnedTemplate','referralBonusUsedTemplate','seasonalSaleAnnouncementTemplate','flashSaleTemplate','earlyAccessToSaleTemplate','sneakPeekTemplate','exclusiveEventTemplate','surveyRequestTemplate','holidayGreetingsTemplate','csrStoriesTemplate','appDownloadInvitationTemplate','abandonedBrowseReminderTemplate','loyaltyTierChangeTemplate','otpForLoginTemplate','failedLoginAttemptWarningTemplate','systemMaintenanceNotificationTemplate','scheduledDowntimeNotificationTemplate','fraudulentTransactionAlertTemplate','sessionTimeoutNotificationTemplate','fraudulentActivityDetectedAdminTemplate','accountSecurityCheckReminderTemplate','newOrderPlacedAdminTemplate','highValueOrderAlertAdminTemplate','lowStockAlertAdminTemplate','outOfStockNotificationAdminTemplate','productDisabledAdminTemplate','newReviewSubmittedAdminTemplate','paymentDisputeAlertAdminTemplate','returnRequestNotificationAdminTemplate','refundProcessedNotificationAdminTemplate','dailySalesReportAdminTemplate','weeklyMonthlySalesReportAdminTemplate','systemErrorFailedJobAlertAdminTemplate','customerSupportTicketCreatedAdminTemplate','inventoryRestockNotificationAdminTemplate','bulkOrderRequestAdminTemplate','customerDataDeletionRequestAdminTemplate','suspiciousAccountActivityAlertAdminTemplate','multipleFailedLoginAttemptsAdminTemplate','accountSuspensionReinstatementNotificationAdminTemplate','userProfileUpdateAlertAdminTemplate','twoFactorStatusChangeAlertAdminTemplate','accountDeletionRequestDeniedAdminTemplate','unusualAccountLoginPatternAdminTemplate','phoneVerificationStatusUpdateAdminTemplate','emailVerificationFailureAlertAdminTemplate','secondaryPhoneVerificationStatusUpdateAdminTemplate','identityVerificationRequestReceivedAdminTemplate','identityVerificationOutcomeNotificationAdminTemplate','accountAccessRevocationAdminTemplate','socialLoginConnectionAlertAdminTemplate','accountMergeRequestReceivedAdminTemplate','highRiskAccountActivityAlertAdminTemplate','accountRecoveryRequestReceivedAdminTemplate','twoFactorCompletedTemplate','LEAD_ADMIN_PROPOSAL_ACCEPTED','LEAD_ADMIN_PROPOSAL_DECLINED','LEAD_PROPOSAL_EXPIRED'];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^const ([A-Za-z_]+) = \(/);
  if (!m) continue;
  const fnm = m[1];
  if (!missing.includes(fnm)) continue;

  let sig = line;
  let j = i;
  if (!line.includes('}) =>')) {
    j = i + 1;
    while (j < lines.length) {
      sig += ' ' + lines[j].trim();
      if (lines[j].includes('}) =>')) break;
      j++;
      if (j - i > 50) break;
    }
  }

  const inner = sig.match(/\(\{([^}]*)\}/);
  if (!inner) { results.push(fnm + '|'); continue; }

  const params = inner[1].split(',').map(p => {
    p = p.trim();
    return p.replace(/\s*=.*/,'').replace(/\s*:.*/,'').trim();
  }).filter(p => p && !p.startsWith('//') && p !== '...');

  results.push(fnm + '|' + params.join(','));
}

fs.writeFileSync('scripts/missing-params.txt', results.join('\n'));
console.log('Done. Found:', results.length);
