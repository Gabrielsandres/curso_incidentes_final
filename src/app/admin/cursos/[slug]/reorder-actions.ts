"use server";

import { reorderModuleAction } from "@/app/actions/update-module";
import { reorderLessonAction } from "@/app/actions/update-lesson";

export async function reorderModuleUpAction(fd: FormData): Promise<void> {
  const moduleId = fd.get("id") as string;
  const newFd = new FormData();
  newFd.append("module_id", moduleId);
  newFd.append("direction", "up");
  await reorderModuleAction({ success: false, message: "" }, newFd);
}

export async function reorderModuleDownAction(fd: FormData): Promise<void> {
  const moduleId = fd.get("id") as string;
  const newFd = new FormData();
  newFd.append("module_id", moduleId);
  newFd.append("direction", "down");
  await reorderModuleAction({ success: false, message: "" }, newFd);
}

export async function reorderLessonUpAction(fd: FormData): Promise<void> {
  const lessonId = fd.get("id") as string;
  const newFd = new FormData();
  newFd.append("lesson_id", lessonId);
  newFd.append("direction", "up");
  await reorderLessonAction({ success: false, message: "" }, newFd);
}

export async function reorderLessonDownAction(fd: FormData): Promise<void> {
  const lessonId = fd.get("id") as string;
  const newFd = new FormData();
  newFd.append("lesson_id", lessonId);
  newFd.append("direction", "down");
  await reorderLessonAction({ success: false, message: "" }, newFd);
}
