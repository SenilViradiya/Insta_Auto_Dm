export const PermissionConstants = {
    INSTAGRAM_BUSINESS_BASIC: 'instagram_business_basic',
    INSTAGRAM_BUSINESS_MANAGE_MESSAGES: 'instagram_business_manage_messages',
    INSTAGRAM_BUSINESS_MANAGE_COMMENTS: 'instagram_business_manage_comments',
} as const;

export const REQUIRED_PERMISSIONS = [
    PermissionConstants.INSTAGRAM_BUSINESS_BASIC,
    PermissionConstants.INSTAGRAM_BUSINESS_MANAGE_MESSAGES,
    PermissionConstants.INSTAGRAM_BUSINESS_MANAGE_COMMENTS,
] as const;
