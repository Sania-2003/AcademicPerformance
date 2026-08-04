from django.core.management.base import BaseCommand

from performance import prediction


class Command(BaseCommand):
    help = "Train a semester performance prediction model from database data or the processed CSV dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            choices=["database", "csv"],
            default="database",
            help="Training data source. Defaults to database.",
        )

    def handle(self, *args, **options):
        try:
            model_path, metrics = prediction.train_and_save_model(source=options["source"])
        except Exception as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return

        self.stdout.write(self.style.SUCCESS(f"Model trained and saved to {model_path}"))
        self.stdout.write(self.style.SUCCESS(f"Accuracy: {metrics['accuracy']:.4f}"))
        self.stdout.write(self.style.SUCCESS(f"Precision: {metrics['precision']:.4f}"))
        self.stdout.write(self.style.SUCCESS(f"Recall: {metrics['recall']:.4f}"))
        self.stdout.write(self.style.SUCCESS(f"F1-Score: {metrics['f1']:.4f}"))
