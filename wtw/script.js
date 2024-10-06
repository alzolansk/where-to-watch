//Trailers
const buttonClose = document.getElementById("closeTrailer")

function mudaFoto (foto){
   document.getElementById('trailer').src = foto

}

function senhaError (senha){
   document.getElementById('senha')
   document.getElementById('confirma_senha')

   senha = 'senha'
   confirmasenha = 'confirma_senha'

   if(senha !== confirmasenha){
      print('Senhas incorretas')
   }
}

//Funções dos Trailers
function showTrailer(trailerUrl) {
    document.getElementById('trailerFrame').src = trailerUrl.replace("watch?v=", "embed/");
    document.getElementById('dialog').showModal();
}

function closeTrailer() {
    document.getElementById('dialog').close();
    document.getElementById('trailerFrame').src = ""; 
}

//Função setinhas de navegação
function scrollLeftCustom(){
   const row = document.querySelector('.row');
   row.scrollBy({
      left: -300, // Valor que vai para a esquerda.
      behavior: 'smooth'
   });
}

function scrollRight(){
   const row = document.querySelector('.row');
   row.scrollBy({
      left: 300, //Valor que vai para a direita.
      behavior: 'smooth'
   });
}

/* Menu */
document.getElementById('menuIcon').addEventListener('click', function(){
   const menu = document.getElementById('menu-buttons');

   if(menu.classList.contains('hidden-menu')) {
      menu.classList.remove('hidden-menu');
      menu.classList.add('active-menu');
   } else {
      menu.classList.remove('active-menu');
      menu.classList.add('hidden-menu')
   }
})

let isMenuOpen = false;

function toggleMenu() {
    const menuIcon = document.getElementById('menuIcon');
    
    if (isMenuOpen) {
        menuIcon.src = 'imagens/menu-icon.png';
    } else {
        menuIcon.src = 'imagens/close-menu.png';
    }

    // Alterna o estado do menu
    isMenuOpen = !isMenuOpen;
}

