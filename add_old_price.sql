-- إضافة عمود السعر القديم (السعر قبل الخصم) لجدول المنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC DEFAULT NULL;
