import * as admin from "firebase-admin";

export const sendMessageToMulticast = async (
    deviceIds: string[],
    title: string,
    body: string
) => {
    await admin.messaging().sendMulticast({
        notification: {
            title: title,
            body: body,
        },
        apns: {
            payload: {
                aps: {
                    badge: 1,
                    sound: "default",
                },
            },
        },
        tokens: deviceIds,
    });
};
