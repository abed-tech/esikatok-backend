from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('videos', '0002_video_date_suppression_video_est_supprime_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='video',
            name='cle_miniature',
            field=models.CharField(blank=True, default='', max_length=500, verbose_name='Clé miniature S3'),
        ),
    ]
