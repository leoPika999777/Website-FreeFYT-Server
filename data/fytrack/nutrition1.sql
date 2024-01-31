-- 這些 SQL 語句用於從不同的數據表中提取和計算與特定會員相關的食物營養資訊，包括碳水化合物、蛋白質、脂肪和熱量的總和。

-- 設置變量：
-- SET @mid:= 1;：設置一個 SQL 變量 @mid，並賦值為 1。這個變量代表會員 ID。
SET @mid:= 1;

-- 查詢會員的所有食物添加記錄：
-- 查詢會員（ID 為 @mid）添加的所有食物記錄。此查詢連接了三個表：fytrack_add（用戶添加的食物）、fytrack_food（食物詳情）、food_category_reference（食物類別）。查詢結果包含所有相關欄位。
SELECT * 
FROM fytrack_add AS fa
JOIN fytrack_food AS ff
  ON fa.food_id = ff.food_id
JOIN food_category_reference AS fcr
  ON fcr.food_category_id = ff.food_category_id
WHERE member_id = @mid;

SET @mid:= 1;

-- 計算會員食物的總碳水化合物含量：
-- 從相同的表聯接中計算出會員添加的所有食物的總碳水化合物含量。
SELECT 
   SUM(ff.food_carb) AS total_food_carb
FROM fytrack_add AS fa
JOIN fytrack_food AS ff
  ON fa.food_id = ff.food_id
JOIN food_category_reference AS fcr
  ON fcr.food_category_id = ff.food_category_id
WHERE member_id = @mid;

SET @mid:= 1;

-- 計算會員食物的總熱量、蛋白質、碳水化合物和脂肪含量：
-- 這條語句進行更全面的數據匯總，計算會員所添加食物的總熱量、蛋白質、碳水化合物和脂肪含量。
SELECT 
   SUM(ff.`food_calorie`) AS total_food_calorie,
   SUM(ff.`food_protein`) AS total_food_protein,
   SUM(ff.`food_carb`) AS total_food_carb,
   SUM(ff.`food_fat`) AS total_food_fat
FROM fytrack_add AS fa
JOIN fytrack_food AS ff
  ON fa.food_id = ff.food_id
JOIN food_category_reference AS fcr
  ON fcr.food_category_id = ff.food_category_id
WHERE member_id = @mid;