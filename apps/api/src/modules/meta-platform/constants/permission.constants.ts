export const PermissionConstants = {
    INSTAGRAM_BASIC: 'instagram_basic',
    INSTAGRAM_MANAGE_MESSAGES: 'instagram_manage_messages',
    INSTAGRAM_MANAGE_COMMENTS: 'instagram_manage_comments',
} as const;

export const REQUIRED_PERMISSIONS = [
    PermissionConstants.INSTAGRAM_BASIC,
    PermissionConstants.INSTAGRAM_MANAGE_MESSAGES,
    PermissionConstants.INSTAGRAM_MANAGE_COMMENTS,
] as const;
