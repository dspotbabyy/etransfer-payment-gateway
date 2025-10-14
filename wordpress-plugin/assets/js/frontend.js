/**
 * E-Transfer WooCommerce Frontend JavaScript
 * Enhanced checkout form validation and user experience
 */

(function($) {
    'use strict';

    /**
     * Enhanced form validation and user experience
     */
    class ETransferCheckoutEnhancer {
        constructor() {
            this.init();
        }

        init() {
            this.bindEvents();
            this.setupRealTimeValidation();
            this.enhanceFormUX();
            this.setupAccessibility();
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            $(document).ready(() => {
                this.setupFormValidation();
                this.enhancePayerHandleField();
            });

            $(document.body).on('updated_checkout', () => {
                this.setupFormValidation();
                this.enhancePayerHandleField();
            });

            $(document.body).on('checkout_error', () => {
                this.handleCheckoutError();
            });
        }

        /**
         * Setup real-time form validation
         */
        setupRealTimeValidation() {
            // Only validate eTransfer specific fields
            $('.woocommerce-checkout').on('input blur', '.etransfer-payer-handle, .etransfer-id-upload', (e) => {
                this.validateField($(e.target));
            });

            $('.woocommerce-checkout').on('change', '.etransfer-payer-handle, .etransfer-id-upload', (e) => {
                this.validateField($(e.target));
            });
        }

        /**
         * Validate individual field
         */
        validateField($field) {
            // Safety check
            if (!$field || !$field.length) {
                return true;
            }

            const $row = $field.closest('.form-row');
            
            // Safety check for val method
            if (typeof $field.val !== 'function') {
                return true;
            }
            
            const value = $field.val();
            const isRequired = $field.attr('required') || $field.hasClass('validate-required');

            // Remove previous validation classes - use eTransfer specific classes
            $row.removeClass('etransfer-invalid etransfer-validated');

            // Skip validation if field is not visible
            if (!$field.is(':visible')) {
                return true;
            }

            // Required field validation
            if (isRequired && !value) {
                $row.addClass('etransfer-invalid');
                this.setFieldMessage($field, 'This field is required.');
                return false;
            }

            // Skip further validation if field is empty and not required
            if (!value && !isRequired) {
                this.clearFieldMessage($field);
                return true;
            }

            // Email validation
            if ($field.attr('type') === 'email' || $field.hasClass('etransfer-payer-handle') || $field.hasClass('validate-email')) {
                if (this.validateEmail(value)) {
                    $row.addClass('etransfer-validated');
                    this.clearFieldMessage($field);
                    return true;
                } else {
                    $row.addClass('etransfer-invalid');
                    this.setFieldMessage($field, 'Please enter a valid email address.');
                    return false;
                }
            }

            // Phone validation
            if ($field.hasClass('validate-phone')) {
                if (this.validatePhone(value)) {
                    $row.addClass('etransfer-validated');
                    this.clearFieldMessage($field);
                    return true;
                } else {
                    $row.addClass('etransfer-invalid');
                    this.setFieldMessage($field, 'Please enter a valid phone number.');
                    return false;
                }
            }

            // Postal code validation
            if ($field.hasClass('validate-postcode')) {
                if (this.validatePostalCode(value)) {
                    $row.addClass('etransfer-validated');
                    this.clearFieldMessage($field);
                    return true;
                } else {
                    $row.addClass('etransfer-invalid');
                    this.setFieldMessage($field, 'Please enter a valid postal code.');
                    return false;
                }
            }

            // Default validation for non-empty fields
            if (value) {
                $row.addClass('etransfer-validated');
                this.clearFieldMessage($field);
                return true;
            }

            return true;
        }

        /**
         * Email validation regex
         */
        validateEmail(email) {
            if (!email || typeof email !== 'string') {
                return false;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        /**
         * Phone validation (flexible format)
         */
        validatePhone(phone) {
            if (!phone || typeof phone !== 'string') {
                return false;
            }
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
            return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
        }

        /**
         * Postal code validation (Canadian and US formats)
         */
        validatePostalCode(postalCode) {
            if (!postalCode || typeof postalCode !== 'string') {
                return false;
            }
            const canadianRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
            const usRegex = /^\d{5}(-\d{4})?$/;
            const cleanCode = postalCode.trim().toUpperCase();
            return canadianRegex.test(cleanCode) || usRegex.test(cleanCode);
        }

        /**
         * Set field validation message
         */
        setFieldMessage($field, message) {
            const $row = $field.closest('.form-row');
            let $message = $row.find('.field-validation-message');

            if (!$message.length) {
                $message = $('<div class="field-validation-message"></div>');
                $row.append($message);
            }

            $message.text(message).show();
        }

        /**
         * Clear field validation message
         */
        clearFieldMessage($field) {
            const $row = $field.closest('.form-row');
            $row.find('.field-validation-message').hide();
        }

        /**
         * Setup complete form validation
         */
        setupFormValidation() {
            $('.woocommerce-checkout').off('checkout_place_order.etransfer').on('checkout_place_order.etransfer', () => {
                return this.validateForm();
            });
        }

        /**
         * Validate entire form before submission
         */
        validateForm() {
            let isValid = true;
            
            // Only validate eTransfer specific fields
            const $etransferFields = $('.woocommerce-checkout .etransfer-payer-handle, .woocommerce-checkout .etransfer-id-upload');

            $etransferFields.each((index, element) => {
                const $field = $(element);
                if (!this.validateField($field)) {
                    isValid = false;
                }
            });

            // Focus on first invalid field
            if (!isValid) {
                const $firstInvalid = $('.woocommerce-checkout .etransfer-invalid').first();
                if ($firstInvalid.length) {
                    this.scrollToElement($firstInvalid);
                    $firstInvalid.find('.input-text, select, textarea').focus();
                }
            }

            return isValid;
        }

        /**
         * Enhance payer handle field specifically
         */
        enhancePayerHandleField() {
            const $payerHandle = $('.etransfer-payer-handle');

            if ($payerHandle.length) {
                // Add placeholder if not set
                if (!$payerHandle.attr('placeholder')) {
                    $payerHandle.attr('placeholder', 'your.email@example.com');
                }

                // Add autocomplete attribute
                $payerHandle.attr('autocomplete', 'email');

                // Add specific validation
                const self = this;
                $payerHandle.on('blur', function() {
                    const $field = $(this);
                    
                    // Safety check to ensure field exists and has val method
                    if (!$field || typeof $field.val !== 'function') {
                        return;
                    }
                    
                    const email = $field.val();

                    if (email && typeof email === 'string' && !self.validateEmail(email)) {
                        self.setFieldMessage($field, 'Please enter the email address you use for e-Transfers.');
                    }
                });
            }
        }

        /**
         * Enhance overall form UX
         */
        enhanceFormUX() {
            // Add loading state management
            this.setupLoadingStates();

            // Add smooth scrolling for better UX
            this.setupSmoothScrolling();

            // Add field focus enhancements
            this.setupFocusEnhancements();

            // Add form progress indication
            this.setupProgressIndication();
        }

        /**
         * Setup loading states
         */
        setupLoadingStates() {
            $(document.body).on('checkout_place_order', () => {
                $('.woocommerce-checkout').addClass('processing');
                $('#place_order').prop('disabled', true);
            });

            $(document.body).on('checkout_error updated_checkout', () => {
                $('.woocommerce-checkout').removeClass('processing');
                $('#place_order').prop('disabled', false);
            });
        }

        /**
         * Setup smooth scrolling
         */
        setupSmoothScrolling() {
            // Smooth scroll to validation errors
            $(document.body).on('checkout_error', () => {
                setTimeout(() => {
                    const $error = $('.woocommerce-error').first();
                    if ($error.length) {
                        this.scrollToElement($error, -100);
                    }
                }, 100);
            });
        }

        /**
         * Setup focus enhancements
         */
        setupFocusEnhancements() {
            $('.woocommerce-checkout').on('focus', '.input-text, select, textarea', function() {
                $(this).closest('.form-row').addClass('field-focused');
            });

            $('.woocommerce-checkout').on('blur', '.input-text, select, textarea', function() {
                $(this).closest('.form-row').removeClass('field-focused');
            });
        }

        /**
         * Setup progress indication
         */
        setupProgressIndication() {
            // Visual indication of form completion progress
            const updateProgress = () => {
                const $etransferFields = $('.woocommerce-checkout .etransfer-payer-handle, .woocommerce-checkout .etransfer-id-upload');
                const $validatedFields = $('.woocommerce-checkout .etransfer-validated');
                const progress = $etransferFields.length > 0 ? ($validatedFields.length / $etransferFields.length) * 100 : 0;

                // You can add a progress bar here if desired
                console.log(`eTransfer form completion: ${Math.round(progress)}%`);
            };

            $('.woocommerce-checkout').on('input change', '.etransfer-payer-handle, .etransfer-id-upload', updateProgress);
        }

        /**
         * Setup accessibility enhancements
         */
        setupAccessibility() {
            // Add ARIA labels and descriptions
            $('.woocommerce-checkout .form-row').each(function() {
                const $row = $(this);
                const $field = $row.find('.input-text, select, textarea');
                const $label = $row.find('label');

                if ($field.length && $label.length) {
                    const fieldId = $field.attr('id') || 'field_' + Math.random().toString(36).substr(2, 9);
                    const labelId = fieldId + '_label';

                    $field.attr('id', fieldId);
                    $label.attr('id', labelId).attr('for', fieldId);
                    $field.attr('aria-labelledby', labelId);

                    // Add aria-required for required fields
                    if ($field.attr('required') || $field.hasClass('validate-required')) {
                        $field.attr('aria-required', 'true');
                    }
                }
            });

            // Add aria-invalid for validation states
            $('.woocommerce-checkout').on('input change', '.etransfer-payer-handle, .etransfer-id-upload', function() {
                const $field = $(this);
                const $row = $field.closest('.form-row');

                setTimeout(() => {
                    if ($row.hasClass('etransfer-invalid')) {
                        $field.attr('aria-invalid', 'true');
                    } else {
                        $field.removeAttr('aria-invalid');
                    }
                }, 100);
            });
        }

        /**
         * Handle checkout errors
         */
        handleCheckoutError() {
            // Add shake animation to invalid fields
            $('.woocommerce-checkout .etransfer-invalid').addClass('shake-animation');

            setTimeout(() => {
                $('.shake-animation').removeClass('shake-animation');
            }, 600);

            // Scroll to first error
            const $firstError = $('.woocommerce-error').first();
            if ($firstError.length) {
                this.scrollToElement($firstError, -100);
            }
        }

        /**
         * Smooth scroll to element
         */
        scrollToElement($element, offset = 0) {
            if ($element.length) {
                $('html, body').animate({
                    scrollTop: $element.offset().top + offset
                }, 500, 'swing');
            }
        }
    }

    // Initialize when DOM is ready
    $(document).ready(() => {
        if ($('.woocommerce-checkout').length) {
            new ETransferCheckoutEnhancer();
        }
    });

    // Add CSS for animations if not already included
    if (!$('#etransfer-animations').length) {
        $('<style id="etransfer-animations">')
            .text(`
                .field-validation-message {
                    color: #ef4444;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    display: none;
                }

                .field-focused label {
                    color: #3b82f6 !important;
                }

                .shake-animation {
                    animation: shake 0.6s ease-in-out;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
                    20%, 40%, 60%, 80% { transform: translateX(2px); }
                }

                .woocommerce-checkout.processing {
                    pointer-events: none;
                    opacity: 0.7;
                }
            `)
            .appendTo('head');
    }

})(jQuery);