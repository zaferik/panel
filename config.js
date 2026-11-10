// Supabase bağlantı bilgileri.
// Bu "publishable" anahtar tarayıcıda durabilir; erişimi veritabanı kuralları korur.
// service_role / secret anahtarını ASLA buraya yazmayın.
window.IK_CONFIG = {
  SUPABASE_URL: "https://vqasjachscuughppoxlo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_n02XO5k1sDFdGuo2MbT5VQ_N9uKLBST",
  EMAIL_DOMAIN: "zafer-ik.local", // hesaplar fonksiyonundaki DOMAIN ile aynı olmalı
  FUNCTION_NAME: "swift-worker"    // Edge Functions > Overview > Endpoint URL sonundaki ad
};
