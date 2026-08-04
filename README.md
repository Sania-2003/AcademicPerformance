# Academic Performance Prediction ERP

[![Backend](https://img.shields.io/badge/Backend-Django%20DRF-blue)](https://www.djangoproject.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20Vite%20Tailwind-green)](https://react.dev/)
[![ML](https://img.shields.io/badge/ML-Keras%20DNN-orange)](https://keras.io/)

## ðŸš€ Overview

**Full-stack Academic ERP with AI-powered performance prediction.**

**Core Features:**
- âœ… Role-based access: Admin, Teacher, Student
- âœ… Course/Student/Teacher management
- âœ… Attendance tracking & percentages
- âœ… Marks entry & SGPA/CGPA calculation
- âœ… **AI Prediction**: Next-semester SGPA/CGPA using Deep Neural Network (MLP)
- âœ… Role-specific dashboards (Admin/Teacher/Student)
- âœ… Real-time API-driven frontend

**Live Demo Screenshots:**
- Admin: User/Course/Record management
- Teacher: Attendance & Marks entry for assigned classes
- Student: Personal attendance/marks/performance predictions

## ðŸ—ï¸ Architecture

```
e:/AcademicPerformance/
â”œâ”€â”€ backend/                    # Django DRF API + ML
â”‚   â”œâ”€â”€ academic_predictor/     # Main project settings
â”‚   â”œâ”€â”€ users/                  # Auth, roles (Admin/Teacher/Student)
â”‚   â”œâ”€â”€ performance/            # Models: StudentPerformance, Attendance, Course
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â””â”€â”€ manage.py
â”œâ”€â”€ frontend/                   # React + Tailwind + Vite
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ pages/dashboards/   # Admin/Teacher/Student
â”‚   â”‚   â”œâ”€â”€ api/                # API clients
â”‚   â”‚   â””â”€â”€ components/
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ vite.config.js
â”œâ”€â”€ data/processed/             # Generated ML datasets (*.csv) [.gitignore]
â”œâ”€â”€ scripts/                    # Data preparation
â”‚   â”œâ”€â”€ prepare_dnn_dataset.py
â”‚   â””â”€â”€ improve_dnn_dataset.py
â”œâ”€â”€ backend/performance/trained_models/
â”‚   â””â”€â”€ semester_performance_model.keras
â”œâ”€â”€ TODO.md                     # This file
â””â”€â”€ README.md
```

## âš™ï¸ Quick Setup (5 mins)

### 1. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Optional Demo Data:**
```bash
python manage.py add_demo_students  # Generates sample users/courses/data
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

**Backend API:** `http://localhost:8000`

### 3. ML Prediction Setup
```bash
# Data prep (if adding new Excel source)
python scripts/prepare_dnn_dataset.py

# Train/Retrain model
cd backend
python manage.py train_performance_model
```

## ðŸŽ¯ Role-Based Features

| Role | Dashboard | Actions |
|------|-----------|---------|
| **Admin** | Full overview | Manage users/courses/attendance/marks |
| **Teacher** | Assigned courses | Mark attendance, enter marks |
| **Student** | Personal stats | View attendance %, marks, **AI predictions** |

## ðŸ“¡ API Endpoints

| Category | Endpoint | Method | Auth |
|----------|----------|--------|------|
| Auth | `/api/login/` | POST | - |
| Profile | `/api/profile/` | GET/PATCH | âœ“ |
| Dashboard | `/api/dashboard/admin/` | GET | âœ“ Admin |
| Users | `/api/admin/users/` | GET/POST/PATCH/DELETE | âœ“ Admin |
| Courses | `/api/admin/courses/` | GET/POST/PATCH/DELETE | âœ“ Admin |
| Attendance | `/api/teacher/attendance-records/` | POST | âœ“ Teacher |

**Full API docs:** Run `python manage.py drf_spectacular` (if installed).

## ðŸ§  ML Prediction Details

**Model:** Keras MLP (Deep Neural Network)
- **Input:** 20+ features (avg marks, attendance, prev SGPA/CGPA, demographics)
- **Output:** next_semester_sgpa, next_semester_cgpa
- **Training Data:** Semester/subject-level CSVs (data/processed/)
- **Usage:** Automatic in StudentDashboard predictions

**Retraining:**
1. Update `data/processed/` via scripts
2. `python manage.py train_performance_model`
3. Model saved to `trained_models/semester_performance_model.keras`

## ðŸš€ Deployment

**Backend (Heroku/Uberspace):**
```bash
pip install -r requirements.txt
gunicorn academic_predictor.wsgi
```

**Frontend (Vercel/Netlify):**
```bash
npm run build  # Generates dist/
```

**Docker (Recommended):**
```dockerfile
# Dockerfile example in root
```

## ðŸ”§ Troubleshooting

### Data Mismatch (Common Issue)
**Symptoms:** Poor predictions due to mark scale differences (training: 0-100, DB: 0-10).

**Solutions:**
1. **Quick Fix:** Model auto-ignores mismatched features (chapter/practical marks set to 0)
2. **Best:** Retrain on real DB data:
   ```bash
   # Export DB to CSV, retrain
   python manage.py train_performance_model
   ```
3. Check data volume: Need 100+ records/student for good accuracy.

### Dependencies
- **Backend:** Python 3.10+, Django 5.x, DRF, Keras/TensorFlow
- **Frontend:** Node 18+, Vite 5.x, React 18+

## ðŸ¤ Contributing

1. Fork & clone
2. Setup dev environment
3. `git checkout -b feature/xyz`
4. Test changes
5. PR to `main`

**Issues to tackle:**
- Add credit hours to models
- Improve data imbalance handling
- Mobile responsiveness
- More prediction features (subject-level)

## ðŸ“„ License
MIT - Free to use/modify.

---

**â­ Star if helpful! Questions? Open an issue.**

## users

Existing demo users:

```text
admin     admin123
teacher1  teacher123
teacher2  teacher123
teacher3  teacher123
student1  student123
student2  student123
student3  student123
```

Generated teacher users:

```text
bulk_teacher_001  password123
bulk_teacher_002  password123
bulk_teacher_003  password123
bulk_teacher_004  password123
bulk_teacher_005  password123
bulk_teacher_006  password123
bulk_teacher_007  password123
bulk_teacher_008  password123
bulk_teacher_009  password123
bulk_teacher_010  password123
bulk_teacher_011  password123
bulk_teacher_012  password123
bulk_teacher_013  password123
bulk_teacher_014  password123
bulk_teacher_015  password123
bulk_teacher_016  password123
bulk_teacher_017  password123
bulk_teacher_018  password123
bulk_teacher_019  password123
bulk_teacher_020  password123
bulk_teacher_021  password123
bulk_teacher_022  password123
bulk_teacher_023  password123
bulk_teacher_024  password123
bulk_teacher_025  password123
bulk_teacher_026  password123
bulk_teacher_027  password123
bulk_teacher_028  password123
bulk_teacher_029  password123
bulk_teacher_030  password123
bulk_teacher_031  password123
bulk_teacher_032  password123
bulk_teacher_033  password123
bulk_teacher_034  password123
bulk_teacher_035  password123
bulk_teacher_036  password123
bulk_teacher_037  password123
bulk_teacher_038  password123
bulk_teacher_039  password123
bulk_teacher_040  password123
bulk_teacher_041  password123
bulk_teacher_042  password123
bulk_teacher_043  password123
bulk_teacher_044  password123
bulk_teacher_045  password123
bulk_teacher_046  password123
bulk_teacher_047  password123
bulk_teacher_048  password123
bulk_teacher_049  password123
bulk_teacher_050  password123
bulk_teacher_051  password123
bulk_teacher_052  password123
bulk_teacher_053  password123
bulk_teacher_054  password123
bulk_teacher_055  password123
bulk_teacher_056  password123
bulk_teacher_057  password123
bulk_teacher_058  password123
bulk_teacher_059  password123
bulk_teacher_060  password123
bulk_teacher_061  password123
bulk_teacher_062  password123
bulk_teacher_063  password123
bulk_teacher_064  password123
bulk_teacher_065  password123
bulk_teacher_066  password123
bulk_teacher_067  password123
bulk_teacher_068  password123
bulk_teacher_069  password123
bulk_teacher_070  password123
bulk_teacher_071  password123
bulk_teacher_072  password123
bulk_teacher_073  password123
bulk_teacher_074  password123
bulk_teacher_075  password123
bulk_teacher_076  password123
bulk_teacher_077  password123
bulk_teacher_078  password123
bulk_teacher_079  password123
bulk_teacher_080  password123
bulk_teacher_081  password123
bulk_teacher_082  password123
bulk_teacher_083  password123
bulk_teacher_084  password123
bulk_teacher_085  password123
bulk_teacher_086  password123
bulk_teacher_087  password123
bulk_teacher_088  password123
bulk_teacher_089  password123
bulk_teacher_090  password123
bulk_teacher_091  password123
bulk_teacher_092  password123
bulk_teacher_093  password123
bulk_teacher_094  password123
bulk_teacher_095  password123
bulk_teacher_096  password123
bulk_teacher_097  password123
bulk_teacher_098  password123
bulk_teacher_099  password123
bulk_teacher_100  password123
```

Generated student users:

```text
bulk_student_0001  password123
bulk_student_0002  password123
bulk_student_0003  password123
bulk_student_0004  password123
bulk_student_0005  password123
bulk_student_0006  password123
bulk_student_0007  password123
bulk_student_0008  password123
bulk_student_0009  password123
bulk_student_0010  password123
bulk_student_0011  password123
bulk_student_0012  password123
bulk_student_0013  password123
bulk_student_0014  password123
bulk_student_0015  password123
bulk_student_0016  password123
bulk_student_0017  password123
bulk_student_0018  password123
bulk_student_0019  password123
bulk_student_0020  password123
bulk_student_0021  password123
bulk_student_0022  password123
bulk_student_0023  password123
bulk_student_0024  password123
bulk_student_0025  password123
bulk_student_0026  password123
bulk_student_0027  password123
bulk_student_0028  password123
bulk_student_0029  password123
bulk_student_0030  password123
bulk_student_0031  password123
bulk_student_0032  password123
bulk_student_0033  password123
bulk_student_0034  password123
bulk_student_0035  password123
bulk_student_0036  password123
bulk_student_0037  password123
bulk_student_0038  password123
bulk_student_0039  password123
bulk_student_0040  password123
bulk_student_0041  password123
bulk_student_0042  password123
bulk_student_0043  password123
bulk_student_0044  password123
bulk_student_0045  password123
bulk_student_0046  password123
bulk_student_0047  password123
bulk_student_0048  password123
bulk_student_0049  password123
bulk_student_0050  password123
bulk_student_0051  password123
bulk_student_0052  password123
bulk_student_0053  password123
bulk_student_0054  password123
bulk_student_0055  password123
bulk_student_0056  password123
bulk_student_0057  password123
bulk_student_0058  password123
bulk_student_0059  password123
bulk_student_0060  password123
bulk_student_0061  password123
bulk_student_0062  password123
bulk_student_0063  password123
bulk_student_0064  password123
bulk_student_0065  password123
bulk_student_0066  password123
bulk_student_0067  password123
bulk_student_0068  password123
bulk_student_0069  password123
bulk_student_0070  password123
bulk_student_0071  password123
bulk_student_0072  password123
bulk_student_0073  password123
bulk_student_0074  password123
bulk_student_0075  password123
bulk_student_0076  password123
bulk_student_0077  password123
bulk_student_0078  password123
bulk_student_0079  password123
bulk_student_0080  password123
bulk_student_0081  password123
bulk_student_0082  password123
bulk_student_0083  password123
bulk_student_0084  password123
bulk_student_0085  password123
bulk_student_0086  password123
bulk_student_0087  password123
bulk_student_0088  password123
bulk_student_0089  password123
bulk_student_0090  password123
bulk_student_0091  password123
bulk_student_0092  password123
bulk_student_0093  password123
bulk_student_0094  password123
bulk_student_0095  password123
bulk_student_0096  password123
bulk_student_0097  password123
bulk_student_0098  password123
bulk_student_0099  password123
bulk_student_0100  password123
bulk_student_0101  password123
bulk_student_0102  password123
bulk_student_0103  password123
bulk_student_0104  password123
bulk_student_0105  password123
bulk_student_0106  password123
bulk_student_0107  password123
bulk_student_0108  password123
bulk_student_0109  password123
bulk_student_0110  password123
bulk_student_0111  password123
bulk_student_0112  password123
bulk_student_0113  password123
bulk_student_0114  password123
bulk_student_0115  password123
bulk_student_0116  password123
bulk_student_0117  password123
bulk_student_0118  password123
bulk_student_0119  password123
bulk_student_0120  password123
bulk_student_0121  password123
bulk_student_0122  password123
bulk_student_0123  password123
bulk_student_0124  password123
bulk_student_0125  password123
bulk_student_0126  password123
bulk_student_0127  password123
bulk_student_0128  password123
bulk_student_0129  password123
bulk_student_0130  password123
bulk_student_0131  password123
bulk_student_0132  password123
bulk_student_0133  password123
bulk_student_0134  password123
bulk_student_0135  password123
bulk_student_0136  password123
bulk_student_0137  password123
bulk_student_0138  password123
bulk_student_0139  password123
bulk_student_0140  password123
bulk_student_0141  password123
bulk_student_0142  password123
bulk_student_0143  password123
bulk_student_0144  password123
bulk_student_0145  password123
bulk_student_0146  password123
bulk_student_0147  password123
bulk_student_0148  password123
bulk_student_0149  password123
bulk_student_0150  password123
bulk_student_0151  password123
bulk_student_0152  password123
bulk_student_0153  password123
bulk_student_0154  password123
bulk_student_0155  password123
bulk_student_0156  password123
bulk_student_0157  password123
bulk_student_0158  password123
bulk_student_0159  password123
bulk_student_0160  password123
bulk_student_0161  password123
bulk_student_0162  password123
bulk_student_0163  password123
bulk_student_0164  password123
bulk_student_0165  password123
bulk_student_0166  password123
bulk_student_0167  password123
bulk_student_0168  password123
bulk_student_0169  password123
bulk_student_0170  password123
bulk_student_0171  password123
bulk_student_0172  password123
bulk_student_0173  password123
bulk_student_0174  password123
bulk_student_0175  password123
bulk_student_0176  password123
bulk_student_0177  password123
bulk_student_0178  password123
bulk_student_0179  password123
bulk_student_0180  password123
bulk_student_0181  password123
bulk_student_0182  password123
bulk_student_0183  password123
bulk_student_0184  password123
bulk_student_0185  password123
bulk_student_0186  password123
bulk_student_0187  password123
bulk_student_0188  password123
bulk_student_0189  password123
bulk_student_0190  password123
bulk_student_0191  password123
bulk_student_0192  password123
bulk_student_0193  password123
bulk_student_0194  password123
bulk_student_0195  password123
bulk_student_0196  password123
bulk_student_0197  password123
bulk_student_0198  password123
bulk_student_0199  password123
bulk_student_0200  password123
bulk_student_0201  password123
bulk_student_0202  password123
bulk_student_0203  password123
bulk_student_0204  password123
bulk_student_0205  password123
bulk_student_0206  password123
bulk_student_0207  password123
bulk_student_0208  password123
bulk_student_0209  password123
bulk_student_0210  password123
bulk_student_0211  password123
bulk_student_0212  password123
bulk_student_0213  password123
bulk_student_0214  password123
bulk_student_0215  password123
bulk_student_0216  password123
bulk_student_0217  password123
bulk_student_0218  password123
bulk_student_0219  password123
bulk_student_0220  password123
bulk_student_0221  password123
bulk_student_0222  password123
bulk_student_0223  password123
bulk_student_0224  password123
bulk_student_0225  password123
bulk_student_0226  password123
bulk_student_0227  password123
bulk_student_0228  password123
bulk_student_0229  password123
bulk_student_0230  password123
bulk_student_0231  password123
bulk_student_0232  password123
bulk_student_0233  password123
bulk_student_0234  password123
bulk_student_0235  password123
bulk_student_0236  password123
bulk_student_0237  password123
bulk_student_0238  password123
bulk_student_0239  password123
bulk_student_0240  password123
bulk_student_0241  password123
bulk_student_0242  password123
bulk_student_0243  password123
bulk_student_0244  password123
bulk_student_0245  password123
bulk_student_0246  password123
bulk_student_0247  password123
bulk_student_0248  password123
bulk_student_0249  password123
bulk_student_0250  password123
bulk_student_0251  password123
bulk_student_0252  password123
bulk_student_0253  password123
bulk_student_0254  password123
bulk_student_0255  password123
bulk_student_0256  password123
bulk_student_0257  password123
bulk_student_0258  password123
bulk_student_0259  password123
bulk_student_0260  password123
bulk_student_0261  password123
bulk_student_0262  password123
bulk_student_0263  password123
bulk_student_0264  password123
bulk_student_0265  password123
bulk_student_0266  password123
bulk_student_0267  password123
bulk_student_0268  password123
bulk_student_0269  password123
bulk_student_0270  password123
bulk_student_0271  password123
bulk_student_0272  password123
bulk_student_0273  password123
bulk_student_0274  password123
bulk_student_0275  password123
bulk_student_0276  password123
bulk_student_0277  password123
bulk_student_0278  password123
bulk_student_0279  password123
bulk_student_0280  password123
bulk_student_0281  password123
bulk_student_0282  password123
bulk_student_0283  password123
bulk_student_0284  password123
bulk_student_0285  password123
bulk_student_0286  password123
bulk_student_0287  password123
bulk_student_0288  password123
bulk_student_0289  password123
bulk_student_0290  password123
bulk_student_0291  password123
bulk_student_0292  password123
bulk_student_0293  password123
bulk_student_0294  password123
bulk_student_0295  password123
bulk_student_0296  password123
bulk_student_0297  password123
bulk_student_0298  password123
bulk_student_0299  password123
bulk_student_0300  password123
bulk_student_0301  password123
bulk_student_0302  password123
bulk_student_0303  password123
bulk_student_0304  password123
bulk_student_0305  password123
bulk_student_0306  password123
bulk_student_0307  password123
bulk_student_0308  password123
bulk_student_0309  password123
bulk_student_0310  password123
bulk_student_0311  password123
bulk_student_0312  password123
bulk_student_0313  password123
bulk_student_0314  password123
bulk_student_0315  password123
bulk_student_0316  password123
bulk_student_0317  password123
bulk_student_0318  password123
bulk_student_0319  password123
bulk_student_0320  password123
bulk_student_0321  password123
bulk_student_0322  password123
bulk_student_0323  password123
bulk_student_0324  password123
bulk_student_0325  password123
bulk_student_0326  password123
bulk_student_0327  password123
bulk_student_0328  password123
bulk_student_0329  password123
bulk_student_0330  password123
bulk_student_0331  password123
bulk_student_0332  password123
bulk_student_0333  password123
bulk_student_0334  password123
bulk_student_0335  password123
bulk_student_0336  password123
bulk_student_0337  password123
bulk_student_0338  password123
bulk_student_0339  password123
bulk_student_0340  password123
bulk_student_0341  password123
bulk_student_0342  password123
bulk_student_0343  password123
bulk_student_0344  password123
bulk_student_0345  password123
bulk_student_0346  password123
bulk_student_0347  password123
bulk_student_0348  password123
bulk_student_0349  password123
bulk_student_0350  password123
bulk_student_0351  password123
bulk_student_0352  password123
bulk_student_0353  password123
bulk_student_0354  password123
bulk_student_0355  password123
bulk_student_0356  password123
bulk_student_0357  password123
bulk_student_0358  password123
bulk_student_0359  password123
bulk_student_0360  password123
bulk_student_0361  password123
bulk_student_0362  password123
bulk_student_0363  password123
bulk_student_0364  password123
bulk_student_0365  password123
bulk_student_0366  password123
bulk_student_0367  password123
bulk_student_0368  password123
bulk_student_0369  password123
bulk_student_0370  password123
bulk_student_0371  password123
bulk_student_0372  password123
bulk_student_0373  password123
bulk_student_0374  password123
bulk_student_0375  password123
bulk_student_0376  password123
bulk_student_0377  password123
bulk_student_0378  password123
bulk_student_0379  password123
bulk_student_0380  password123
bulk_student_0381  password123
bulk_student_0382  password123
bulk_student_0383  password123
bulk_student_0384  password123
bulk_student_0385  password123
bulk_student_0386  password123
bulk_student_0387  password123
bulk_student_0388  password123
bulk_student_0389  password123
bulk_student_0390  password123
bulk_student_0391  password123
bulk_student_0392  password123
bulk_student_0393  password123
bulk_student_0394  password123
bulk_student_0395  password123
bulk_student_0396  password123
bulk_student_0397  password123
bulk_student_0398  password123
bulk_student_0399  password123
bulk_student_0400  password123
bulk_student_0401  password123
bulk_student_0402  password123
bulk_student_0403  password123
bulk_student_0404  password123
bulk_student_0405  password123
bulk_student_0406  password123
bulk_student_0407  password123
bulk_student_0408  password123
bulk_student_0409  password123
bulk_student_0410  password123
bulk_student_0411  password123
bulk_student_0412  password123
bulk_student_0413  password123
bulk_student_0414  password123
bulk_student_0415  password123
bulk_student_0416  password123
bulk_student_0417  password123
bulk_student_0418  password123
bulk_student_0419  password123
bulk_student_0420  password123
bulk_student_0421  password123
bulk_student_0422  password123
bulk_student_0423  password123
bulk_student_0424  password123
bulk_student_0425  password123
bulk_student_0426  password123
bulk_student_0427  password123
bulk_student_0428  password123
bulk_student_0429  password123
bulk_student_0430  password123
bulk_student_0431  password123
bulk_student_0432  password123
bulk_student_0433  password123
bulk_student_0434  password123
bulk_student_0435  password123
bulk_student_0436  password123
bulk_student_0437  password123
bulk_student_0438  password123
bulk_student_0439  password123
bulk_student_0440  password123
bulk_student_0441  password123
bulk_student_0442  password123
bulk_student_0443  password123
bulk_student_0444  password123
bulk_student_0445  password123
bulk_student_0446  password123
bulk_student_0447  password123
bulk_student_0448  password123
bulk_student_0449  password123
bulk_student_0450  password123
bulk_student_0451  password123
bulk_student_0452  password123
bulk_student_0453  password123
bulk_student_0454  password123
bulk_student_0455  password123
bulk_student_0456  password123
bulk_student_0457  password123
bulk_student_0458  password123
bulk_student_0459  password123
bulk_student_0460  password123
bulk_student_0461  password123
bulk_student_0462  password123
bulk_student_0463  password123
bulk_student_0464  password123
bulk_student_0465  password123
bulk_student_0466  password123
bulk_student_0467  password123
bulk_student_0468  password123
bulk_student_0469  password123
bulk_student_0470  password123
bulk_student_0471  password123
bulk_student_0472  password123
bulk_student_0473  password123
bulk_student_0474  password123
bulk_student_0475  password123
bulk_student_0476  password123
bulk_student_0477  password123
bulk_student_0478  password123
bulk_student_0479  password123
bulk_student_0480  password123
bulk_student_0481  password123
bulk_student_0482  password123
bulk_student_0483  password123
bulk_student_0484  password123
bulk_student_0485  password123
bulk_student_0486  password123
bulk_student_0487  password123
bulk_student_0488  password123
bulk_student_0489  password123
bulk_student_0490  password123
bulk_student_0491  password123
bulk_student_0492  password123
bulk_student_0493  password123
bulk_student_0494  password123
bulk_student_0495  password123
bulk_student_0496  password123
bulk_student_0497  password123
bulk_student_0498  password123
bulk_student_0499  password123
bulk_student_0500  password123
bulk_student_0501  password123
bulk_student_0502  password123
bulk_student_0503  password123
bulk_student_0504  password123
bulk_student_0505  password123
bulk_student_0506  password123
bulk_student_0507  password123
bulk_student_0508  password123
bulk_student_0509  password123
bulk_student_0510  password123
bulk_student_0511  password123
bulk_student_0512  password123
bulk_student_0513  password123
bulk_student_0514  password123
bulk_student_0515  password123
bulk_student_0516  password123
bulk_student_0517  password123
bulk_student_0518  password123
bulk_student_0519  password123
bulk_student_0520  password123
bulk_student_0521  password123
bulk_student_0522  password123
bulk_student_0523  password123
bulk_student_0524  password123
bulk_student_0525  password123
bulk_student_0526  password123
bulk_student_0527  password123
bulk_student_0528  password123
bulk_student_0529  password123
bulk_student_0530  password123
bulk_student_0531  password123
bulk_student_0532  password123
bulk_student_0533  password123
bulk_student_0534  password123
bulk_student_0535  password123
bulk_student_0536  password123
bulk_student_0537  password123
bulk_student_0538  password123
bulk_student_0539  password123
bulk_student_0540  password123
bulk_student_0541  password123
bulk_student_0542  password123
bulk_student_0543  password123
bulk_student_0544  password123
bulk_student_0545  password123
bulk_student_0546  password123
bulk_student_0547  password123
bulk_student_0548  password123
bulk_student_0549  password123
bulk_student_0550  password123
bulk_student_0551  password123
bulk_student_0552  password123
bulk_student_0553  password123
bulk_student_0554  password123
bulk_student_0555  password123
bulk_student_0556  password123
bulk_student_0557  password123
bulk_student_0558  password123
bulk_student_0559  password123
bulk_student_0560  password123
bulk_student_0561  password123
bulk_student_0562  password123
bulk_student_0563  password123
bulk_student_0564  password123
bulk_student_0565  password123
bulk_student_0566  password123
bulk_student_0567  password123
bulk_student_0568  password123
bulk_student_0569  password123
bulk_student_0570  password123
bulk_student_0571  password123
bulk_student_0572  password123
bulk_student_0573  password123
bulk_student_0574  password123
bulk_student_0575  password123
bulk_student_0576  password123
bulk_student_0577  password123
bulk_student_0578  password123
bulk_student_0579  password123
bulk_student_0580  password123
bulk_student_0581  password123
bulk_student_0582  password123
bulk_student_0583  password123
bulk_student_0584  password123
bulk_student_0585  password123
bulk_student_0586  password123
bulk_student_0587  password123
bulk_student_0588  password123
bulk_student_0589  password123
bulk_student_0590  password123
bulk_student_0591  password123
bulk_student_0592  password123
bulk_student_0593  password123
bulk_student_0594  password123
bulk_student_0595  password123
bulk_student_0596  password123
bulk_student_0597  password123
bulk_student_0598  password123
bulk_student_0599  password123
bulk_student_0600  password123
bulk_student_0601  password123
bulk_student_0602  password123
bulk_student_0603  password123
bulk_student_0604  password123
bulk_student_0605  password123
bulk_student_0606  password123
bulk_student_0607  password123
bulk_student_0608  password123
bulk_student_0609  password123
bulk_student_0610  password123
bulk_student_0611  password123
bulk_student_0612  password123
bulk_student_0613  password123
bulk_student_0614  password123
bulk_student_0615  password123
bulk_student_0616  password123
bulk_student_0617  password123
bulk_student_0618  password123
bulk_student_0619  password123
bulk_student_0620  password123
bulk_student_0621  password123
bulk_student_0622  password123
bulk_student_0623  password123
bulk_student_0624  password123
bulk_student_0625  password123
bulk_student_0626  password123
bulk_student_0627  password123
bulk_student_0628  password123
bulk_student_0629  password123
bulk_student_0630  password123
bulk_student_0631  password123
bulk_student_0632  password123
bulk_student_0633  password123
bulk_student_0634  password123
bulk_student_0635  password123
bulk_student_0636  password123
bulk_student_0637  password123
bulk_student_0638  password123
bulk_student_0639  password123
bulk_student_0640  password123
bulk_student_0641  password123
bulk_student_0642  password123
bulk_student_0643  password123
bulk_student_0644  password123
bulk_student_0645  password123
bulk_student_0646  password123
bulk_student_0647  password123
bulk_student_0648  password123
bulk_student_0649  password123
bulk_student_0650  password123
bulk_student_0651  password123
bulk_student_0652  password123
bulk_student_0653  password123
bulk_student_0654  password123
bulk_student_0655  password123
bulk_student_0656  password123
bulk_student_0657  password123
bulk_student_0658  password123
bulk_student_0659  password123
bulk_student_0660  password123
bulk_student_0661  password123
bulk_student_0662  password123
bulk_student_0663  password123
bulk_student_0664  password123
bulk_student_0665  password123
bulk_student_0666  password123
bulk_student_0667  password123
bulk_student_0668  password123
bulk_student_0669  password123
bulk_student_0670  password123
bulk_student_0671  password123
bulk_student_0672  password123
bulk_student_0673  password123
bulk_student_0674  password123
bulk_student_0675  password123
bulk_student_0676  password123
bulk_student_0677  password123
bulk_student_0678  password123
bulk_student_0679  password123
bulk_student_0680  password123
bulk_student_0681  password123
bulk_student_0682  password123
bulk_student_0683  password123
bulk_student_0684  password123
bulk_student_0685  password123
bulk_student_0686  password123
bulk_student_0687  password123
bulk_student_0688  password123
bulk_student_0689  password123
bulk_student_0690  password123
bulk_student_0691  password123
bulk_student_0692  password123
bulk_student_0693  password123
bulk_student_0694  password123
bulk_student_0695  password123
bulk_student_0696  password123
bulk_student_0697  password123
bulk_student_0698  password123
bulk_student_0699  password123
bulk_student_0700  password123
bulk_student_0701  password123
bulk_student_0702  password123
bulk_student_0703  password123
bulk_student_0704  password123
bulk_student_0705  password123
bulk_student_0706  password123
bulk_student_0707  password123
bulk_student_0708  password123
bulk_student_0709  password123
bulk_student_0710  password123
bulk_student_0711  password123
bulk_student_0712  password123
bulk_student_0713  password123
bulk_student_0714  password123
bulk_student_0715  password123
bulk_student_0716  password123
bulk_student_0717  password123
bulk_student_0718  password123
bulk_student_0719  password123
bulk_student_0720  password123
bulk_student_0721  password123
bulk_student_0722  password123
bulk_student_0723  password123
bulk_student_0724  password123
bulk_student_0725  password123
bulk_student_0726  password123
bulk_student_0727  password123
bulk_student_0728  password123
bulk_student_0729  password123
bulk_student_0730  password123
bulk_student_0731  password123
bulk_student_0732  password123
bulk_student_0733  password123
bulk_student_0734  password123
bulk_student_0735  password123
bulk_student_0736  password123
bulk_student_0737  password123
bulk_student_0738  password123
bulk_student_0739  password123
bulk_student_0740  password123
bulk_student_0741  password123
bulk_student_0742  password123
bulk_student_0743  password123
bulk_student_0744  password123
bulk_student_0745  password123
bulk_student_0746  password123
bulk_student_0747  password123
bulk_student_0748  password123
bulk_student_0749  password123
bulk_student_0750  password123
bulk_student_0751  password123
bulk_student_0752  password123
bulk_student_0753  password123
bulk_student_0754  password123
bulk_student_0755  password123
bulk_student_0756  password123
bulk_student_0757  password123
bulk_student_0758  password123
bulk_student_0759  password123
bulk_student_0760  password123
bulk_student_0761  password123
bulk_student_0762  password123
bulk_student_0763  password123
bulk_student_0764  password123
bulk_student_0765  password123
bulk_student_0766  password123
bulk_student_0767  password123
bulk_student_0768  password123
bulk_student_0769  password123
bulk_student_0770  password123
bulk_student_0771  password123
bulk_student_0772  password123
bulk_student_0773  password123
bulk_student_0774  password123
bulk_student_0775  password123
bulk_student_0776  password123
bulk_student_0777  password123
bulk_student_0778  password123
bulk_student_0779  password123
bulk_student_0780  password123
bulk_student_0781  password123
bulk_student_0782  password123
bulk_student_0783  password123
bulk_student_0784  password123
bulk_student_0785  password123
bulk_student_0786  password123
bulk_student_0787  password123
bulk_student_0788  password123
bulk_student_0789  password123
bulk_student_0790  password123
bulk_student_0791  password123
bulk_student_0792  password123
bulk_student_0793  password123
bulk_student_0794  password123
bulk_student_0795  password123
bulk_student_0796  password123
bulk_student_0797  password123
bulk_student_0798  password123
bulk_student_0799  password123
bulk_student_0800  password123
bulk_student_0801  password123
bulk_student_0802  password123
bulk_student_0803  password123
bulk_student_0804  password123
bulk_student_0805  password123
bulk_student_0806  password123
bulk_student_0807  password123
bulk_student_0808  password123
bulk_student_0809  password123
bulk_student_0810  password123
bulk_student_0811  password123
bulk_student_0812  password123
bulk_student_0813  password123
bulk_student_0814  password123
bulk_student_0815  password123
bulk_student_0816  password123
bulk_student_0817  password123
bulk_student_0818  password123
bulk_student_0819  password123
bulk_student_0820  password123
bulk_student_0821  password123
bulk_student_0822  password123
bulk_student_0823  password123
bulk_student_0824  password123
bulk_student_0825  password123
bulk_student_0826  password123
bulk_student_0827  password123
bulk_student_0828  password123
bulk_student_0829  password123
bulk_student_0830  password123
bulk_student_0831  password123
bulk_student_0832  password123
bulk_student_0833  password123
bulk_student_0834  password123
bulk_student_0835  password123
bulk_student_0836  password123
bulk_student_0837  password123
bulk_student_0838  password123
bulk_student_0839  password123
bulk_student_0840  password123
bulk_student_0841  password123
bulk_student_0842  password123
bulk_student_0843  password123
bulk_student_0844  password123
bulk_student_0845  password123
bulk_student_0846  password123
bulk_student_0847  password123
bulk_student_0848  password123
bulk_student_0849  password123
bulk_student_0850  password123
bulk_student_0851  password123
bulk_student_0852  password123
bulk_student_0853  password123
bulk_student_0854  password123
bulk_student_0855  password123
bulk_student_0856  password123
bulk_student_0857  password123
bulk_student_0858  password123
bulk_student_0859  password123
bulk_student_0860  password123
bulk_student_0861  password123
bulk_student_0862  password123
bulk_student_0863  password123
bulk_student_0864  password123
bulk_student_0865  password123
bulk_student_0866  password123
bulk_student_0867  password123
bulk_student_0868  password123
bulk_student_0869  password123
bulk_student_0870  password123
bulk_student_0871  password123
bulk_student_0872  password123
bulk_student_0873  password123
bulk_student_0874  password123
bulk_student_0875  password123
bulk_student_0876  password123
bulk_student_0877  password123
bulk_student_0878  password123
bulk_student_0879  password123
bulk_student_0880  password123
bulk_student_0881  password123
bulk_student_0882  password123
bulk_student_0883  password123
bulk_student_0884  password123
bulk_student_0885  password123
bulk_student_0886  password123
bulk_student_0887  password123
bulk_student_0888  password123
bulk_student_0889  password123
bulk_student_0890  password123
bulk_student_0891  password123
bulk_student_0892  password123
bulk_student_0893  password123
bulk_student_0894  password123
bulk_student_0895  password123
bulk_student_0896  password123
bulk_student_0897  password123
bulk_student_0898  password123
bulk_student_0899  password123
bulk_student_0900  password123
bulk_student_0901  password123
bulk_student_0902  password123
bulk_student_0903  password123
bulk_student_0904  password123
bulk_student_0905  password123
bulk_student_0906  password123
bulk_student_0907  password123
bulk_student_0908  password123
bulk_student_0909  password123
bulk_student_0910  password123
bulk_student_0911  password123
bulk_student_0912  password123
bulk_student_0913  password123
bulk_student_0914  password123
bulk_student_0915  password123
bulk_student_0916  password123
bulk_student_0917  password123
bulk_student_0918  password123
bulk_student_0919  password123
bulk_student_0920  password123
bulk_student_0921  password123
bulk_student_0922  password123
bulk_student_0923  password123
bulk_student_0924  password123
bulk_student_0925  password123
bulk_student_0926  password123
bulk_student_0927  password123
bulk_student_0928  password123
bulk_student_0929  password123
bulk_student_0930  password123
bulk_student_0931  password123
bulk_student_0932  password123
bulk_student_0933  password123
bulk_student_0934  password123
bulk_student_0935  password123
bulk_student_0936  password123
bulk_student_0937  password123
bulk_student_0938  password123
bulk_student_0939  password123
bulk_student_0940  password123
bulk_student_0941  password123
bulk_student_0942  password123
bulk_student_0943  password123
bulk_student_0944  password123
bulk_student_0945  password123
bulk_student_0946  password123
bulk_student_0947  password123
bulk_student_0948  password123
bulk_student_0949  password123
bulk_student_0950  password123
bulk_student_0951  password123
bulk_student_0952  password123
bulk_student_0953  password123
bulk_student_0954  password123
bulk_student_0955  password123
bulk_student_0956  password123
bulk_student_0957  password123
bulk_student_0958  password123
bulk_student_0959  password123
bulk_student_0960  password123
bulk_student_0961  password123
bulk_student_0962  password123
bulk_student_0963  password123
bulk_student_0964  password123
bulk_student_0965  password123
bulk_student_0966  password123
bulk_student_0967  password123
bulk_student_0968  password123
bulk_student_0969  password123
bulk_student_0970  password123
bulk_student_0971  password123
bulk_student_0972  password123
bulk_student_0973  password123
bulk_student_0974  password123
bulk_student_0975  password123
bulk_student_0976  password123
bulk_student_0977  password123
bulk_student_0978  password123
bulk_student_0979  password123
bulk_student_0980  password123
bulk_student_0981  password123
bulk_student_0982  password123
bulk_student_0983  password123
bulk_student_0984  password123
bulk_student_0985  password123
bulk_student_0986  password123
bulk_student_0987  password123
bulk_student_0988  password123
bulk_student_0989  password123
bulk_student_0990  password123
bulk_student_0991  password123
bulk_student_0992  password123
bulk_student_0993  password123
bulk_student_0994  password123
bulk_student_0995  password123
bulk_student_0996  password123
bulk_student_0997  password123
bulk_student_0998  password123
bulk_student_0999  password123
bulk_student_1000  password123
```

