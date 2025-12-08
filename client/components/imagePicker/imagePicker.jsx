require('./imagePicker.less');
const React = require('react');
const createClass = require('create-react-class');
import request from '../../homebrew/utils/request-middleware.js';

const ImagePicker = createClass({
	displayName : 'ImagePicker',
	getDefaultProps : function() {
		return {
			onSelect : ()=>{},
			onClose  : ()=>{},
		};
	},

	getInitialState : function() {
		return {
			files           : [],
			folders         : [],
			currentFolder   : '',
			search          : '',
			loading         : false,
			error           : null,
			uploadProgress  : 0,
			isUploading     : false,
			showFolderInput : false,
			newFolderName   : '',
			page            : 1,
			totalPages      : 1,
			loadingImages   : {},
		};
	},

	componentDidMount : function() {
		this.loadMedia();
	},

	loadMedia : function() {
		this.setState({ loading: true, error: null });

		const { currentFolder, search, page } = this.state;
		const params = new URLSearchParams({
			folder : currentFolder,
			search : search,
			page   : page,
			limit  : 24
		});

		const apiUrl = `${global.config.seneVerseBackendUrl}/api/media/list?${params}`;

		fetch(apiUrl, {
			credentials : 'include',
			method      : 'GET'
		})
			.then((response)=>response.json())
			.then((data)=>{
				if(data.success) {
					const loadingImages = {};
					data.data.files.forEach((file)=>{
						if(file.fileType === 'image') {
							loadingImages[file.path] = true;
						}
					});
					this.setState({
						files         : data.data.files,
						folders       : data.data.folders,
						loading       : false,
						totalPages    : data.data.pagination.totalPages,
						loadingImages : loadingImages
					});
				} else {
					this.setState({
						loading : false,
						error   : data.error || 'Failed to load media'
					});
				}
			})
			.catch((err)=>{
				console.error('Error loading media:', err);
				this.setState({
					loading : false,
					error   : err.message || 'Failed to load media'
				});
			});
	},

	handleSearch : function(e) {
		this.setState({ search: e.target.value, page: 1 }, ()=>{
			this.loadMedia();
		});
	},

	handleFolderClick : function(folder) {
		this.setState({ currentFolder: folder, page: 1 }, ()=>{
			this.loadMedia();
		});
	},

	handleBackClick : function() {
		const parts = this.state.currentFolder.split('/');
		parts.pop();
		const newFolder = parts.join('/');
		this.setState({ currentFolder: newFolder, page: 1 }, ()=>{
			this.loadMedia();
		});
	},

	handleFileSelect : function(file) {
		this.props.onSelect(file.url);
		this.props.onClose();
	},

	handleFileUpload : function(e) {
		const file = e.target.files[0];
		if(!file) return;

		this.setState({ isUploading: true, uploadProgress: 0, error: null });

		const formData = new FormData();
		formData.append('file', file);
		formData.append('folder', this.state.currentFolder);

		const apiUrl = `${global.config.seneVerseBackendUrl}/api/media/upload`;

		fetch(apiUrl, {
			method      : 'POST',
			body        : formData,
			credentials : 'include'
		})
			.then((response)=>response.json())
			.then((data)=>{
				if(data.success) {
					this.setState({ isUploading: false, uploadProgress: 100 });
					this.loadMedia();
				} else {
					this.setState({
						isUploading : false,
						error       : data.error || 'Failed to upload file'
					});
				}
			})
			.catch((err)=>{
				console.error('Error uploading file:', err);
				this.setState({
					isUploading : false,
					error       : err.message || 'Failed to upload file'
				});
			});
	},

	handleCreateFolder : function() {
		const { newFolderName, currentFolder } = this.state;
		if(!newFolderName.trim()) return;

		this.setState({ loading: true, error: null });

		const apiUrl = `${global.config.seneVerseBackendUrl}/api/media/create-folder`;

		fetch(apiUrl, {
			method      : 'POST',
			credentials : 'include',
			headers     : {
				'Content-Type' : 'application/json'
			},
			body : JSON.stringify({
				name   : newFolderName,
				parent : currentFolder
			})
		})
			.then((response)=>response.json())
			.then((data)=>{
				if(data.success) {
					this.setState({
						loading         : false,
						showFolderInput : false,
						newFolderName   : ''
					});
					this.loadMedia();
				} else {
					this.setState({
						loading : false,
						error   : data.error || 'Failed to create folder'
					});
				}
			})
			.catch((err)=>{
				console.error('Error creating folder:', err);
				this.setState({
					loading : false,
					error   : err.message || 'Failed to create folder'
				});
			});
	},

	handlePageChange : function(newPage) {
		this.setState({ page: newPage }, ()=>{
			this.loadMedia();
		});
	},

	handleImageLoad : function(filePath) {
		this.setState((prevState)=>{
			const loadingImages = { ...prevState.loadingImages };
			delete loadingImages[filePath];
			return { loadingImages };
		});
	},

	renderBreadcrumbs : function() {
		const parts = this.state.currentFolder ? this.state.currentFolder.split('/') : [];
		const breadcrumbs = [{ name: 'Root', path: '' }];

		parts.forEach((part, index)=>{
			breadcrumbs.push({
				name : part,
				path : parts.slice(0, index + 1).join('/')
			});
		});

		return <div className='breadcrumbs'>
			{breadcrumbs.map((crumb, index)=>{
				return <span key={index}>
					<span
						className='breadcrumb'
						onClick={()=>this.handleFolderClick(crumb.path)}>
						{crumb.name}
					</span>
					{index < breadcrumbs.length - 1 && <span className='separator'> / </span>}
				</span>;
			})}
		</div>;
	},

	renderPagination : function() {
		const { page, totalPages } = this.state;
		if(totalPages <= 1) return null;

		return <div className='pagination'>
			<button
				disabled={page === 1}
				onClick={()=>this.handlePageChange(page - 1)}>
				Previous
			</button>
			<span className='pageInfo'>
				Page {page} of {totalPages}
			</span>
			<button
				disabled={page === totalPages}
				onClick={()=>this.handlePageChange(page + 1)}>
				Next
			</button>
		</div>;
	},

	render : function() {
		const { files, folders, loading, error, isUploading, uploadProgress, showFolderInput, newFolderName, search, loadingImages } = this.state;

		return <div className='imagePickerOverlay' onClick={this.props.onClose}>
			<div className='imagePickerModal' onClick={(e)=>e.stopPropagation()}>
				<div className='header'>
					<h2>Select Image</h2>
					<button className='closeBtn' onClick={this.props.onClose}>×</button>
				</div>

				<div className='toolbar'>
					<input
						type='text'
						className='searchInput'
						placeholder='Search images...'
						value={search}
						onChange={this.handleSearch}
					/>
					<div className='actions'>
						<label className='uploadBtn'>
							<i className='fas fa-upload' />
							Upload
							<input
								type='file'
								accept='image/*'
								onChange={this.handleFileUpload}
								style={{ display: 'none' }}
							/>
						</label>
						<button
							className='createFolderBtn'
							onClick={()=>this.setState({ showFolderInput: !showFolderInput })}>
							<i className='fas fa-folder-plus' />
							New Folder
						</button>
					</div>
				</div>

				{showFolderInput && <div className='folderInput'>
					<input
						type='text'
						placeholder='Folder name...'
						value={newFolderName}
						onChange={(e)=>this.setState({ newFolderName: e.target.value })}
						onKeyPress={(e)=>{
							if(e.key === 'Enter') this.handleCreateFolder();
						}}
					/>
					<button onClick={this.handleCreateFolder}>Create</button>
					<button onClick={()=>this.setState({ showFolderInput: false, newFolderName: '' })}>
						Cancel
					</button>
				</div>}

				{this.renderBreadcrumbs()}

				{error && <div className='error'>{error}</div>}

				{isUploading && <div className='uploadProgress'>
					<div className='progressBar' style={{ width: `${uploadProgress}%` }} />
					<span>Uploading...</span>
				</div>}

				<div className='content'>
					{loading ? (
						<div className='loading'>
							<i className='fas fa-spinner fa-spin' />
							Loading...
						</div>
					) : (
						<>
							{this.state.currentFolder && !search && (
								<div className='backFolder' onClick={this.handleBackClick}>
									<i className='fas fa-arrow-left' />
									<span>Back</span>
								</div>
							)}

							{!search && folders.map((folder)=>{
								return <div
									key={folder.path}
									className='folderItem'
									onClick={()=>this.handleFolderClick(folder.path)}>
									<i className='fas fa-folder' />
									<span>{folder.name}</span>
								</div>;
							})}

							{files.map((file)=>{
								return <div
									key={file.path}
									className='fileItem'
									onClick={()=>this.handleFileSelect(file)}>
									{file.fileType === 'image' ? (
										<div className='imageContainer'>
											{loadingImages[file.path] && (
												<div className='imageLoading'>
													<i className='fas fa-spinner fa-spin' />
												</div>
											)}
											<img
												src={file.thumbnailUrl}
												alt={file.name}
												onLoad={()=>this.handleImageLoad(file.path)}
												style={{ display: loadingImages[file.path] ? 'none' : 'block' }}
											/>
										</div>
									) : (
										<div className='fileIcon'>
											<i className={`fas fa-file-${file.fileType}`} />
										</div>
									)}
									<span className='fileName'>{file.name}</span>
								</div>;
							})}

							{files.length === 0 && folders.length === 0 && !loading && (
								<div className='emptyState'>
									<i className='fas fa-images' />
									<p>No images found</p>
								</div>
							)}
						</>
					)}
				</div>

				{this.renderPagination()}
			</div>
		</div>;
	}
});

module.exports = ImagePicker;
