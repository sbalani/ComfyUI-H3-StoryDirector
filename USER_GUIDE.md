# H3 Story Director 1.0.0

One story brief and a set of character/location references become an edited video in one ComfyUI queue. A local Qwen writer chooses the shots and their individual lengths; H3 renders them, saves each clip, trims to exact durations, and assembles the movie with its generated audio.

Open **H3 Story Director → 12_H3_Story_Director_v1** on the test pod. This is the new starting workflow; you do not need 11A–11D for this path.

## First run

1. **REFERENCES:** open the H3 picker. Choose your character sheet as Picture 1 and a location as Picture 2. Add more character or location pictures when needed.
2. **PLAN:** write the story. In `reference_notes`, describe who or what each picture represents. Use the same order as the picker. For example: `<Subject 1> is Mara, the adult woman in <Picture 1>. <Subject 2> is Adrian, the adult man in <Picture 2>. <Subject 3> is the hotel in <Picture 3>.` Add distinctive clothing and continuity details. The writer is text-only; it needs this description and does not inspect the images. H3's separate vision encoder uses the images when rendering.
3. Choose a **project** name, **target_seconds**, and **max_clips**. Target seconds is the length of the whole movie. Max clips is a ceiling; Qwen chooses the actual count and durations. Each clip is 5–15 seconds. The largest plan is 12 clips / 180 seconds.
4. Leave **Auto plan + render**, **Draft 672x384**, and **20 steps** selected. Queue once. Planning, all renders, and final assembly happen in that queue.
5. The final video appears in **FINISHED MOVIE**. The timeline lists each clip and its duration. Production status identifies the current clip; ComfyUI's sampling bar shows progress within that clip.

An example 20-second brief can become 5s + 7s + 8s. These are three separate generations with real edit boundaries, not requests for H3 to cut at those times inside one generation.

## Review the plan before paying for video generation

Choose **Plan only**, then Queue. The writer runs but H3 does not load or render. Click **Edit shot plan** to change the cards: title, seconds, camera/action, sound/dialogue, and take number. Add, remove, or reorder clips. Click **Save plan & use it**, then Queue to render that plan.

**Use edited plan + render** follows your edited durations. In this mode the target_seconds control is ignored; the movie length is the sum of the cards. The timeline updates when queued. Timings round to the nearest frame at 24 fps.

The `plan_json` widget is the saved backing data for the editor and travels with a saved workflow. You do not need to edit it by hand. If you refresh before saving a generated plan into the workflow, run Plan only again (the plan is cached), or paste the saved `latest_plan.json` into that widget and select edited mode.

## Resume or improve one clip

Every completed clip is saved immediately. On a rerun, unchanged clips are loaded from disk. Keep project, references, style, seeds and render settings unchanged to reuse them.

- To try a different performance for one clip, increase its **Take number** in the editor.
- To fix an action, change that clip's description. Its render changes; the other unchanged clips are reused.
- Changing shared references, style, resolution, steps, or the base seed invalidates affected clips. Reordering changes position-based seeds, so moved clips rerender.
- A cancelled/incomplete clip restarts; completed clips survive a ComfyUI restart. There is no mid-sampling checkpoint.
- Switching to edited mode freezes the generated plan. In Auto mode, changing the story, target, reference notes, style, seed or maximum count creates a new plan.

## Files

Under `ComfyUI/output/h3_story_director/<project>/`:

- `latest_plan.json`: current editable story plan and reference notes.
- `plan_<hash>.json`: cached automatically generated plan.
- `clips/<hash>.mp4` and `.json`: reusable individual clips and their render settings. The console and `latest_edit.json` identify their titles and order.
- `latest_edit.json` and `edit_<hash>.json`: ordered edit manifest, including clip paths, durations and the complete plan.
- `writer.log` and `writer_<hash>_*.txt`: local Qwen diagnostics and original response.

Final videos are saved under `output/h3_story_director/masters/`. The final Save Video node embeds the queued API prompt and workflow metadata. Project names are sanitized for folder names; use distinct names containing letters, numbers, underscores or hyphens.

## What to expect

This is an **edited sequence with hard cuts**. Shared references encourage identity, costume and location consistency. They do not enforce identical room geometry, props, voices or motion between independent clips. It is not a seamless-take continuation system. Keep each clip's action simple, and review generated plans for causality and continuity before longer runs. For dialogue, give short lines and clear speakers.

Each clip has H3's own generated audio. The final edit preserves it, so ambience can change at cuts. No music is requested by default. A continuous music/dialogue mix is not included in this version.

Draft resolution is important: on our A100, earlier 10s / 20-step jobs took about 17s per sampling step at 672×384 versus 97s at 1344×768, plus encoding/decoding. These are observed examples, not fixed estimates. A long film still costs the sum of its individual renders. The workflow does not silently switch to PDMD or another quality-reducing accelerator.

## Install elsewhere

The pack includes the workflow, custom nodes, installer, source, tests and documentation. It does not include model weights or the user's private reference images. Select your own images after importing the workflow.

Requires the tested ComfyUI 0.39.0 / frontend 1.55.14 (or a compatible version with native H3, Video Slice and ConcatenateVideo), the Fantastic H3 media picker/refmod encoder pack already used by 11A, PyTorch with CUDA, Transformers supporting Qwen3, and huggingface_hub. Use ComfyUI's own Python/venv; this pack does not reinstall PyTorch or alter system packages.

Run:

```bash
/path/to/ComfyUI/venv/bin/python install.py /path/to/ComfyUI --download-writer
```

This installs the new nodes and workflow and downloads the pinned **Qwen/Qwen3-4B-Instruct-2507** writer (roughly 8 GB of weights) into `models/LLM/`. The writer runs in a separate short-lived process and frees its GPU allocations before H3 starts. It uses no external API key or paid text-generation service. Restart ComfyUI when its queue is idle, then refresh the browser.

The workflow also expects your existing H3 files:

- `diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors`
- `text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`
- `vae/minimax_h3_video_vae_fp16.safetensors`
- `vae/minimax_h3_audio_vae_fp32.safetensors`

These are separate from the Qwen writer. Optional RefMods pass through the Fantastic encoder; none are required. RefMod descriptions must use the correct labels in reference_notes. The included example is tested with two picture references, not with every RefMod combination.

## Sources and implementation

The [H3 Multishot project](https://github.com/jlucasmcrell/ComfyUI-H3-Multishot) informed the distinction between scene planning and seamless continuation. This workflow uses a new director node with [ComfyUI graph expansion](https://docs.comfy.org/custom-nodes/backend/expansion) and the already-tested Fantastic/native H3 nodes; it does not require or install the Multishot pack. It adds independent per-clip durations and disk reuse for an edited-sequence workflow.

Writer: [Qwen3-4B-Instruct-2507](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507), revision `cdbee75f17c01a7cc42f958dc650907174af0554` (Apache-2.0). No third-party source code or weights are bundled in this pack.

Workflow release **1.0.0** is separate from the Docker image version. This task does not publish or overwrite a Docker tag.

Required Fantastic pack: [ComfyUI-Fantastic-MiniMaxH3-PromptBuilder](https://github.com/Adudeguyman/ComfyUI-Fantastic-MiniMaxH3-PromptBuilder), tested commit `1e8df670cc212c692e422690829731ae403906f4`. Install it through Manager or its upstream instructions if your ComfyUI does not already have the H3 picker and RefMod encoder.

## Install from GitHub

Clone this repository into `ComfyUI/custom_nodes`, then use the same Python environment as ComfyUI:

```sh
python -m pip install -r requirements.txt
```

Restart ComfyUI and refresh the browser. This does not install PyTorch or change its CUDA build. Use a current ComfyUI with native MiniMax H3 support (tested: 0.39.0).

Story Director requires the Fantastic MiniMax H3 PromptBuilder pack, native H3 models/VAEs/text encoder, and the local Qwen3-4B-Instruct-2507 writer for automatic planning. Manual edited plans do not need the writer. The RunPod 0.23 installer installs these nodes and downloads the writer when H3 is enabled. Model weights are not included.

## Endangered AI

[Patreon](https://www.patreon.com/endangeredai) · [YouTube](https://www.youtube.com/@endangeredai) · [Website](https://endangeredai.com/)
