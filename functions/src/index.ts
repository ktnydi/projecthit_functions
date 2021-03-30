import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendMessageToMulticast } from "./message";
admin.initializeApp();
const timeZone = "Asia/Tokyo";
process.env.TZ = timeZone;

export const sendReminder = functions
    .region("asia-northeast1")
    .pubsub.schedule("00 7 * * *")
    .timeZone(timeZone)
    .onRun(async (_) => {
        const date = new Date();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const now = admin.firestore.Timestamp.fromDate(
            new Date(`${year}-${month}-${day} 00:00:00`)
        );

        // リマインダーの日付が今日であるタスクを全て取得
        const tasksSnapshot = await admin
            .firestore()
            .collectionGroup("projectTasks")
            .where("expiredAt", "==", now)
            .get();

        return await Promise.all(
            tasksSnapshot.docs.map(async (taskDoc) => {
                // 完了済みのタスクは通知しない
                const isDone = taskDoc.data()["isDone"] as boolean;
                if (isDone) return;

                // タスク担当者idを取得
                const taskUserIds = taskDoc.data()["taskUserIds"] as string[];

                if (taskUserIds.length == 0) return;

                for (let i = 0; i < taskUserIds.length; i++) {
                    // タスク担当者のデバイストークンを取得 (複数デバイス対応)
                    const userId = taskUserIds[i];
                    const tokensSnapshot = await admin
                        .firestore()
                        .collection("users")
                        .doc(userId)
                        .collection("tokens")
                        .get();
                    const deviceIds = tokensSnapshot.docs.map((doc) => doc.id);
                    const title = "今日のタスク";
                    const body = taskDoc.data()["name"];

                    // プッシュ通知を送信
                    await sendMessageToMulticast(deviceIds, title, body);
                }
            })
        );
    });
