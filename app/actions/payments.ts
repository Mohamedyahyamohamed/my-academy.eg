async function requirePaymentRecorder(): Promise<{ user: SessionUser } | { error: string }> {
  const user = getCurrentUser();
  
  // 1. طباعة بيانات المستخدم في الـ Terminal الخاص بالسيرفر لمعرفة حالته
  console.log("Payment Action - Current User:", user);

  if (!user) {
    console.log("Reason: No user found (Cookies/Token missing or expired)");
    return { error: "SESSION_EXPIRED" };
  }

  // 2. التحقق من الصلاحيات
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "TEACHER") {
    console.log(`Reason: User has wrong role (${user.role})`);
    // من الأفضل إرجاع رسالة مختلفة هنا لتسهيل اكتشاف الخطأ في الـ Frontend
    return { error: "UNAUTHORIZED_ROLE" }; 
  }

  return { user };
}
