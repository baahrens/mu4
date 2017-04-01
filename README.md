
```
Usage: node convert.js -d /some/dir [options]

Options:
  -d, --dir       Directory with mp3 files to convert             [required]
  -c, --cover     Cover file to use. Defaults to Cover.jpg
  -o, --output    Output directory. Defaults to the input directory
  -p, --parallel  How many files to process in parallel. Defaults to 5
  -m, --metadata  Whether to get metadata and name the file       [boolean]
                  "[Artist] - [Title]". Defaults to false
  -h, --help      show help                                       [boolean]

Examples:
  node convert.js -d /some/dir/with/mp3s -p 15         converts all mp3s to mp4 using
                                                       Cover.jpg while processing 15 files in parallel
  node convert.js -d /some/dir/with/mp3s -c front.jpg  converts all mp3s to mp4 using
  node convert.js -d /some/dir/with/mp3s -m            converts all mp3s to mp4 using their
                                                       metadata to name the output files [Artist] - [Title]
  node convert.js -d /some/dir/with/mp3s -o some/dir   converts all mp3s to mp4 using the specified output directory
