import pandas as pd

file_path = 'サンヨネ店舗別出荷数バックアップ.xlsx'
xl = pd.ExcelFile(file_path)

sheets = ['日曜日出荷　小粒', '日曜日出荷　 フクユタカ', '平日出荷　小粒', '平日出荷　フクユタカ']

for sheet in sheets:
    print(f"\n=== Sheet: {sheet} ===")
    try:
        df = xl.parse(sheet, header=None)
        
        # Find '店舗名' row
        target_row_idx = -1
        for i, row in df.iterrows():
            if row.astype(str).str.contains('店舗名').any():
                target_row_idx = i
                break
        
        if target_row_idx != -1:
            # Get Store Names (Row X) and Quantities (Row X+1)
            store_row = df.iloc[target_row_idx]
            qty_row = df.iloc[target_row_idx + 1]
            
            # Find the index where '店舗名' is, and start from there + 1?
            # Or just iterate and find valid columns
            # In the previous output, '店舗名' was at col 1 (0-indexed 1?), stores at 2,3,4...
            # Let's print pairs
            stores = []
            for col in range(len(store_row)):
                val = str(store_row[col])
                if val != 'nan' and val != '店舗名' and val != '合計':
                    qty = qty_row[col]
                    stores.append((val, qty))
            print("Stores:", stores)
            
            # Check if there is a 'Total' column
            # In previous output, '合計' was at the end.
            
    except Exception as e:
        print(f"Error: {e}")
