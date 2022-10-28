class VideoParser {
	_video = document.createElement('video');
	_canvas = document.createElement('canvas');
	_render = document.createElement('canvas');
	_context;
	_renderContext;

	constructor(file, video, render) {
		if (!(file instanceof File)) throw new TypeError(`Can't parse non-files`);
		if (!this._video.canPlayType(file.type)) throw new TypeError(`Can't parse file of type ${file.type}`);

		if (video instanceof HTMLVideoElement) this._video = video;
		if (render instanceof HTMLCanvasElement) this._render = render;

		this._video.src = URL.createObjectURL(file);
		this._video.load();
		this._video.muted = true;

		this._video.onloadedmetadata = () => {
			this._canvas.width = this._video.videoWidth;
			this._canvas.height = this._video.videoHeight;
			this._render.width = this._video.videoWidth;
			this._render.height = this._video.videoHeight;
			this._video.width = this._video.videoWidth;
			this._video.height = this._video.videoHeight;
		};

		this._context = this._canvas.getContext('2d', { willReadFrequently: true });
		this._renderContext = this._render.getContext('2d', { willReadFrequently: true });
	}

	frameData(parser) {
		return new Promise(async (resolve) => {
			const originalFrames = [],
				parsedFrames = [],
				recordedChunks = [];

			let stream = this._render.captureStream(60);
			let recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });

			this._video.ontimeupdate = async () => {
				recorder.pause();
				await new Promise(res => setTimeout(res, 8));
				if(recorder.state != 'inactive') recorder.resume();
				this._video.pause();
				

				let frame = originalFrames.length;

				if (this._video.videoWidth > 0) {
					this._context.drawImage(this._video, 0, 0);

					let data = this._context.getImageData(0, 0, this._video.videoWidth, this._video.videoHeight).data,
						parsedData;

					originalFrames.push(data);

					if (typeof parser == 'function') {
						parsedData = new ImageData(parser(data, frame), this._video.videoWidth, this._video.videoHeight);
						this._renderContext.putImageData(parsedData, 0, 0);
						parsedFrames.push(parsedData);
					}
				}

				if (this._video.currentTime < this._video.duration) {
					await this._video.play();
				}
			};

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					recordedChunks.push(e.data);
				}
			};

			this._video.onended = async () => {
				recorder.stop();
				await new Promise((res) => setTimeout(res, 25));
				let blob = new Blob(recordedChunks, { type: 'video/webm' });
				resolve(blob);
			};

			this._video.playbackRate = 2;
			recorder.start();
			recorder.pause();
			this._video.play();
			
		});
	}

	get videoCompletion() {
		return this._video.currentTime / this._video.duration;
	}
}
