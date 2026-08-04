import csv
import json
import re
import statistics
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET


WORKBOOK_PATH = Path("realistic_university_dataset.xlsx")
OUTPUT_DIR = Path("data") / "processed"

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def normalize_key(value):
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def parse_workbook(path):
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"].lstrip("/") for rel in rels}

        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("a:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iterfind(".//a:t", NS)))

        def cell_value(cell):
            cell_type = cell.attrib.get("t")
            value_node = cell.find("a:v", NS)
            if value_node is None:
                inline_node = cell.find("a:is", NS)
                if inline_node is not None:
                    return "".join(node.text or "" for node in inline_node.iterfind(".//a:t", NS))
                return ""
            if cell_type == "s":
                return shared_strings[int(value_node.text)] if shared_strings else value_node.text
            return value_node.text

        sheets = {}
        for sheet in workbook.find("a:sheets", NS):
            name = sheet.attrib["name"]
            target = relmap[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
            sheet_root = ET.fromstring(archive.read(target))
            rows = list(sheet_root.find("a:sheetData", NS))
            header = [cell_value(cell) for cell in rows[0].findall("a:c", NS)]
            normalized_header = [normalize_key(item) for item in header]

            records = []
            for row in rows[1:]:
                values = [cell_value(cell) for cell in row.findall("a:c", NS)]
                if len(values) != len(normalized_header):
                    continue
                records.append(dict(zip(normalized_header, values)))
            sheets[name.lower()] = records

        return sheets


def grade_from_marks(total_marks):
    if total_marks >= 85:
        return "A", 4.00
    if total_marks >= 80:
        return "A-", 3.66
    if total_marks >= 75:
        return "B+", 3.33
    if total_marks >= 71:
        return "B", 3.00
    if total_marks >= 68:
        return "B-", 2.66
    if total_marks >= 64:
        return "C+", 2.33
    if total_marks >= 61:
        return "C", 2.00
    if total_marks >= 58:
        return "C-", 1.66
    if total_marks >= 54:
        return "D+", 1.30
    if total_marks >= 50:
        return "D", 1.00
    return "F", 0.00


def to_float(value):
    return float(value) if value not in ("", None) else 0.0


def safe_mean(values):
    return round(sum(values) / len(values), 4) if values else 0.0


def safe_std_dev(values):
    """Calculate standard deviation, return 0 if less than 2 values."""
    if len(values) < 2:
        return 0.0
    mean_val = sum(values) / len(values)
    variance = sum((x - mean_val) ** 2 for x in values) / len(values)
    return round(variance ** 0.5, 4)


def sgpa_to_performance_tier(sgpa):
    """Convert SGPA to performance tier for classification."""
    if sgpa >= 3.5:
        return "Excellent"
    elif sgpa >= 3.0:
        return "Good"
    elif sgpa >= 2.0:
        return "Average"
    else:
        return "Poor"


def subject_key(record):
    return (record["student_id"], record["semester"], record["subject"])


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    sheets = parse_workbook(WORKBOOK_PATH)
    main_rows = sheets["main"]
    chapter_rows = sheets["chapter"]
    topic_rows = sheets["topic"]
    practical_rows = sheets["practical"]

    chapter_by_subject = defaultdict(list)
    for row in chapter_rows:
        chapter_by_subject[subject_key(row)].append(
            {
                "chapter": row["chapter"],
                "marks": to_float(row["marks"]),
            }
        )

    topic_by_subject = defaultdict(list)
    for row in topic_rows:
        topic_by_subject[subject_key(row)].append(
            {
                "chapter": row["chapter"],
                "topic": row["topic"],
                "marks": to_float(row["marks"]),
            }
        )

    practical_by_subject = defaultdict(list)
    for row in practical_rows:
        practical_by_subject[subject_key(row)].append(
            {
                "practical": row["practical"],
                "marks": to_float(row["marks"]),
            }
        )

    subject_names = sorted({row["subject"] for row in main_rows})
    subject_index = {name: index for index, name in enumerate(subject_names)}

    subject_level_rows = []
    semester_groups = defaultdict(list)

    for row in main_rows:
        key = subject_key(row)
        quiz = to_float(row["quiz_20"])
        assignment = to_float(row["assignment_20"])
        mid = to_float(row["mid_20"])
        final = to_float(row["final_40"])
        total = to_float(row["total_100"])
        attendance = to_float(row["attendance"])

        chapter_items = chapter_by_subject.get(key, [])
        topic_items = topic_by_subject.get(key, [])
        practical_items = practical_by_subject.get(key, [])

        grade, grade_points = grade_from_marks(total)

        # Determine credit hours: 3 for theoretical subjects, 1 for practical/lab subjects
        credit_hours = 1 if practical_items else 3

        subject_row = {
            "student_id": int(row["student_id"]),
            "semester": int(row["semester"]),
            "subject": row["subject"],
            "subject_index": subject_index[row["subject"]],
            "quiz_marks": quiz,
            "assignment_marks": assignment,
            "mid_marks": mid,
            "final_marks": final,
            "attendance_percent": attendance,
            "total_marks": total,
            "grade": grade,
            "grade_points": grade_points,
            "chapter_count": len(chapter_items),
            "chapter_marks_total": round(sum(item["marks"] for item in chapter_items), 4),
            "chapter_marks_avg": safe_mean([item["marks"] for item in chapter_items]),
            "topic_count": len(topic_items),
            "topic_marks_total": round(sum(item["marks"] for item in topic_items), 4),
            "topic_marks_avg": safe_mean([item["marks"] for item in topic_items]),
            "practical_count": len(practical_items),
            "practical_marks_total": round(sum(item["marks"] for item in practical_items), 4),
            "practical_marks_avg": safe_mean([item["marks"] for item in practical_items]),
            "credit_hours": credit_hours,
        }

        subject_level_rows.append(subject_row)
        semester_groups[(subject_row["student_id"], subject_row["semester"])].append(subject_row)

    semester_level_rows = []
    grouped_by_student = defaultdict(list)

    for (student_id, semester), records in sorted(semester_groups.items()):
        total_marks = [item["total_marks"] for item in records]
        attendance_values = [item["attendance_percent"] for item in records]
        grade_points = [item["grade_points"] for item in records]
        credit_hours_list = [item["credit_hours"] for item in records]
        practical_totals = [item["practical_marks_total"] for item in records]
        chapter_totals = [item["chapter_marks_total"] for item in records]
        topic_totals = [item["topic_marks_total"] for item in records]

        # Calculate weighted SGPA: sum(grade_points * credit_hours) / sum(credit_hours)
        total_weighted_points = sum(gp * ch for gp, ch in zip(grade_points, credit_hours_list))
        total_credit_hours = sum(credit_hours_list)
        sgpa = round(total_weighted_points / total_credit_hours, 4) if total_credit_hours > 0 else 0.0

        semester_row = {
            "student_id": student_id,
            "semester": semester,
            "subject_count": len(records),
            "avg_total_marks": safe_mean(total_marks),
            "max_total_marks": max(total_marks),
            "min_total_marks": min(total_marks),
            "avg_attendance_percent": safe_mean(attendance_values),
            "avg_grade_points": safe_mean(grade_points),
            "sgpa": sgpa,
            "total_credit_hours": total_credit_hours,
            "practical_marks_total": round(sum(practical_totals), 4),
            "practical_marks_avg": safe_mean(practical_totals),
            "chapter_marks_total": round(sum(chapter_totals), 4),
            "chapter_marks_avg": safe_mean(chapter_totals),
            "topic_marks_total": round(sum(topic_totals), 4),
            "topic_marks_avg": safe_mean(topic_totals),
            "failed_subjects": sum(1 for value in grade_points if value == 0),
            "high_grade_subjects": sum(1 for value in grade_points if value >= 3.33),
        }
        grouped_by_student[student_id].append(semester_row)

    for student_id, rows in grouped_by_student.items():
        rows.sort(key=lambda item: item["semester"])
        cumulative_weighted_points = 0.0
        cumulative_credit_hours = 0.0
        previous_sgpa = None
        for index, row in enumerate(rows):
            row["previous_sgpa"] = round(previous_sgpa, 4) if previous_sgpa is not None else ""
            
            # Calculate cumulative CGPA weighted by credit hours
            cumulative_weighted_points += row["sgpa"] * row["total_credit_hours"]
            cumulative_credit_hours += row["total_credit_hours"]
            row["cgpa"] = round(cumulative_weighted_points / cumulative_credit_hours, 4) if cumulative_credit_hours > 0 else 0.0
            
            row["semester_index"] = index + 1
            previous_sgpa = row["sgpa"]

        for index, row in enumerate(rows):
            # Compute trend features
            if index > 0:
                prev_row = rows[index - 1]
                sgpa_trend = round(row["sgpa"] - prev_row["sgpa"], 4)
                failed_subjects_delta = row["failed_subjects"] - prev_row["failed_subjects"]
            else:
                sgpa_trend = 0.0
                failed_subjects_delta = 0
            
            row["sgpa_trend"] = sgpa_trend
            row["failed_subjects_delta"] = failed_subjects_delta
            
            # Add next semester targets
            next_row = rows[index + 1] if index + 1 < len(rows) else None
            row["next_semester_sgpa"] = next_row["sgpa"] if next_row else ""
            row["next_semester_cgpa"] = next_row["cgpa"] if next_row else ""
            row["next_semester_performance_tier"] = sgpa_to_performance_tier(next_row["sgpa"]) if next_row else ""
            semester_level_rows.append(row)

    subject_fieldnames = [
        "student_id",
        "semester",
        "subject",
        "subject_index",
        "quiz_marks",
        "assignment_marks",
        "mid_marks",
        "final_marks",
        "attendance_percent",
        "total_marks",
        "grade",
        "grade_points",
        "chapter_count",
        "chapter_marks_total",
        "chapter_marks_avg",
        "topic_count",
        "topic_marks_total",
        "topic_marks_avg",
        "practical_count",
        "practical_marks_total",
        "practical_marks_avg",
        "credit_hours",
    ]

    semester_fieldnames = [
        "student_id",
        "semester",
        "semester_index",
        "subject_count",
        "avg_total_marks",
        "max_total_marks",
        "min_total_marks",
        "avg_attendance_percent",
        "avg_grade_points",
        "sgpa",
        "total_credit_hours",
        "cgpa",
        "previous_sgpa",
        "sgpa_trend",
        "practical_marks_total",
        "practical_marks_avg",
        "chapter_marks_total",
        "chapter_marks_avg",
        "topic_marks_total",
        "topic_marks_avg",
        "failed_subjects",
        "failed_subjects_delta",
        "high_grade_subjects",
        "next_semester_sgpa",
        "next_semester_cgpa",
        "next_semester_performance_tier",
    ]

    write_csv(OUTPUT_DIR / "dnn_subject_level.csv", subject_level_rows, subject_fieldnames)
    write_csv(OUTPUT_DIR / "dnn_semester_level.csv", semester_level_rows, semester_fieldnames)

    metadata = {
        "source_workbook": str(WORKBOOK_PATH),
        "assumptions": [
            "Grade points are calculated from the grading table shared by the user.",
            "Theoretical subjects are assigned 3 credit hours, practical/lab subjects are assigned 1 credit hour.",
            "SGPA is computed as the credit-hour weighted average of subject grade points within a semester.",
            "CGPA is computed as the cumulative credit-hour weighted average of all semester SGPAs.",
            "next_semester_sgpa and next_semester_cgpa are training targets for forecasting tasks.",
        ],
        "sheet_sizes": {
            "main": len(main_rows),
            "chapter": len(chapter_rows),
            "topic": len(topic_rows),
            "practical": len(practical_rows),
        },
        "subject_level_rows": len(subject_level_rows),
        "semester_level_rows": len(semester_level_rows),
        "unique_students": len(grouped_by_student),
        "unique_subjects": len(subject_names),
        "grade_distribution": dict(Counter(row["grade"] for row in subject_level_rows)),
    }

    (OUTPUT_DIR / "dnn_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(f"Wrote {len(subject_level_rows)} subject-level rows to {OUTPUT_DIR / 'dnn_subject_level.csv'}")
    print(f"Wrote {len(semester_level_rows)} semester-level rows to {OUTPUT_DIR / 'dnn_semester_level.csv'}")
    print(f"Wrote metadata to {OUTPUT_DIR / 'dnn_metadata.json'}")


if __name__ == "__main__":
    main()
