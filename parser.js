class VideoParser {
	#video = document.createElement('video');
	#canvas = document.createElement('canvas');
	#render = document.createElement('canvas');
	#context;
	#renderContext;

	constructor(file, video, render){
		if(!(file instanceof File)) throw new TypeError(`Can't parse non-files`);
		if(!(this.#video.canPlayType(file.type))) throw new TypeError(`Can't parse file of type ${file.type}`);

		if(video instanceof HTMLVideoElement) this.#video = video;
		if(render instanceof HTMLCanvasElement) this.#render = render;
	
		this.#video.src = URL.createObjectURL(file);
		this.#video.load();
		this.#video.muted = true;		

		this.#video.onloadedmetadata = () => {
			this.#canvas.width = this.#video.videoWidth;
			this.#canvas.height = this.#video.videoHeight;
			this.#render.width = this.#video.videoWidth;
			this.#render.height = this.#video.videoHeight;
			this.#video.width = this.#video.videoWidth;
			this.#video.height = this.#video.videoHeight;
		}

		this.#context = this.#canvas.getContext('2d', {willReadFrequently: true});
		this.#renderContext = this.#render.getContext('2d', {willReadFrequently: true});

	}

	frameData(parser){

		return new Promise(resolve => {
			const originalFrames = [], parsedFrames = [], recordedChunks = [];

			let stream = this.#render.captureStream(0);
			let recorder = new MediaRecorder(stream);

			this.#video.ontimeupdate = async () => {

				await new Promise(res => setTimeout(res, 4));

				this.#video.pause();

				let frame = originalFrames.length;

				if(this.#video.videoWidth > 0){
					this.#context.drawImage(this.#video, 0, 0);
				
					let data = this.#context.getImageData(0, 0, this.#video.videoWidth, this.#video.videoHeight).data, parsedData;

					originalFrames.push(data);

					if(typeof parser == 'function'){
						parsedData = new ImageData(parser(data, frame), this.#video.videoWidth, this.#video.videoHeight);
						this.#renderContext.putImageData(parsedData, 0, 0);
						parsedFrames.push(parsedData);
					}					
				}

				if (this.#video.currentTime < this.#video.duration) {
					this.#video.play();
				}
			};

			recorder.ondataavailable = e => {
				console.log(e)
				if(e.data.size > 0){
					recordedChunks.push(e.data);
				}
			}

			this.#video.onended = () => {
				recorder.stop();
				const blob = new Blob(parsedFrames, {type: 'video/webm'});
				console.log(blob);
				resolve(originalFrames, parsedFrames, blob);
			}

			this.#video.playbackRate = 2;
			recorder.start();
			this.#video.play();
		});
	}

	get videoCompletion(){
		return this.#video.currentTime / this.#video.duration;
	}

}