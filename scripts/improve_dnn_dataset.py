import pandas as pd
import numpy as np
from imblearn.over_sampling import SMOTE
from sklearn.preprocessing import LabelEncoder
from pathlib import Path

def improve_semester_dataset():
    df = pd.read_csv('data/processed/dnn_semester_level.csv')
    print('Original shape:', df.shape)
    print('Target distribution:\\n', df['next_semester_performance_tier'].value_counts())
    
    # 1. Fill zero fields with realistic values based on avg_total_marks
    df['chapter_marks_avg'] = np.where(df['chapter_marks_avg'] == 0, df['avg_total_marks'] * 0.6, df['chapter_marks_avg'])
    df['topic_marks_avg'] = np.where(df['topic_marks_avg'] == 0, df['avg_total_marks'] * 0.5, df['topic_marks_avg'])
    df['practical_marks_avg'] = np.where(df['practical_marks_avg'] == 0, df['avg_total_marks'] * 0.7, df['practical_marks_avg'])
    
    # 2. Drop leakage columns
    if 'cgpa' in df.columns:
        df = df.drop('cgpa', axis=1)
    
    # 3. Add new feature: risk_score
    df['risk_score'] = df['failed_subjects'] * 10 + (3.5 - df['sgpa']) * 5
    
    # 4. Encode target
    le = LabelEncoder()
    df['target_encoded'] = le.fit_transform(df['next_semester_performance_tier'])
    
    # 5. Balance with SMOTE (select numeric features)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric_cols.remove('target_encoded')  # exclude target for X
    X = df[numeric_cols]
    y = df['target_encoded']
    
    smote = SMOTE(random_state=42)
    X_res, y_res = smote.fit_resample(X, y)
    
    # 6. Create improved df
    df_improved = pd.DataFrame(X_res, columns=numeric_cols)
    df_improved['next_semester_performance_tier'] = le.inverse_transform(y_res)
    
    df_improved.to_csv('data/processed/dnn_semester_improved_full.csv', index=False)
    print('Improved semester saved! New shape:', df_improved.shape)
    print('Balanced target:\\n', df_improved['next_semester_performance_tier'].value_counts())
    
    return df_improved

def improve_subject_dataset():
    df = pd.read_csv('data/processed/dnn_subject_level.csv')
    print('Subject shape:', df.shape)
    
    # Fill any zeros/missing with medians
    num_cols = df.select_dtypes(include=[np.number]).columns
    df[num_cols] = df[num_cols].fillna(df[num_cols].median())
    
    df.to_csv('data/processed/dnn_subject_improved.csv', index=False)
    print('Subject improved saved!')
    
    return df

if __name__ == '__main__':
    improve_semester_dataset()
    improve_subject_dataset()
    print('All improvements complete! Ready for DNN training.')
