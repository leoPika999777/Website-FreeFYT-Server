-- 這段SQL查詢涉及四個表格：
-- fytrack_nutrition, fytrack_add, fytrack_food, 和 food_category_reference。
SELECT * 
-- 將fytrack_nutrition（別名fn）與fytrack_add（別名fa）進行連接。連接的條件是fytrack_nutrition表的ntdentry_sid欄位必須等於fytrack_add表的add_sid欄位。
FROM fytrack_nutrition AS fn
JOIN fytrack_add AS fa
    ON fn.ntdentry_sid = fa.add_sid
-- 繼續將前面的結果與fytrack_food（別名ff）表連接。連接的條件是fytrack_add表的food_id欄位必須等於fytrack_food表的food_id欄位。    
JOIN fytrack_food AS ff
  ON fa.food_id = ff.food_id
-- 再將前面的結果與food_category_reference（別名fcr）表連接。連接的條件是food_category_reference表的food_category_id欄位必須等於fytrack_food表的food_category_id欄位。
JOIN food_category_reference AS fcr
  ON fcr.food_category_id = ff.food_category_id
-- 這是一個篩選條件。它指定只返回fytrack_nutrition表中member_id為1的記錄，且fytrack_add表中ntentry_date為2024年1月3日的記錄。
WHERE fn.member_id = 1 AND fa.ntentry_date='2024-01-03'
-- 總結：這段SQL查詢會從這四個表中選擇出所有相關的欄位，這些表通過特定的欄位連接在一起，並根據特定的會員ID和日期過濾資料。用於檢索特定成员在特定日期的食物攝入和營養數據的查詢。