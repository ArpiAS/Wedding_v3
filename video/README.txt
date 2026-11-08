Այստեղ դիր վիդեոն՝ invitation.mov (փոքրատառ!)

Պահանջ (որ բոլոր հեռախոսներում, այդ թվում iPhone 7-ում, առանց կախվելու բացվի և երգը լսվի).
  - ֆորմատը՝ .MOV, վիդեո կոդեկ՝ H.264 (ոչ HEVC/H.265, ոչ ProRes), ձայն՝ AAC
  - «fast start» (moov atom-ը ֆայլի սկզբում), որ սկսի նվագել առանց ամբողջը բեռնելու
  - չափը՝ ցանկալի է 15 ՄԲ-ից քիչ, լայնությունը՝ մինչև 1080 px

iPhone-ով նկարած/մոնտաժած .mov-ը հաճախ HEVC է՝ այն Android-ում չի նվագի։ Վերափոխելու հրամանը (ffmpeg).
  ffmpeg -i original.mov -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 24 -preset slow -vf "scale='min(1080,iw)':-2" -c:a aac -b:a 128k -movflags +faststart invitation.mov (փոքրատառ!)
